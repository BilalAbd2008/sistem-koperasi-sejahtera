"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Eye, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import { exportToExcel } from "@/lib/export";

interface TrialBalanceRow {
  kodeRekening: string;
  namaRekening: string;
  kategori: string;
  saldoDebit: number;
  saldoKredit: number;
}

const currentYear = () => String(new Date().getFullYear());

const todayLabel = () =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

function ReportActionButton({
  children,
  variant = "light",
  onClick,
}: {
  children: React.ReactNode;
  variant?: "dark" | "yellow" | "light";
  onClick: () => void;
}) {
  const className =
    variant === "dark"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "yellow"
        ? "bg-sky-600 text-white hover:bg-sky-700"
        : "bg-slate-100 text-slate-800 hover:bg-slate-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold transition ${className}`}
    >
      {children}
    </button>
  );
}

export default function TrialBalanceReport() {
  const [year, setYear] = useState(currentYear());
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        periode_awal: `${year}-01-01`,
        periode_akhir: `${year}-12-31`,
        system: "new",
      });
      const response = await fetch(`/api/laporan-keuangan/trial-balance?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal memuat neraca saldo");
      }

      setRows(result.data || []);
    } catch (err) {
      setError(String(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          debit: acc.debit + Number(row.saldoDebit || 0),
          kredit: acc.kredit + Number(row.saldoKredit || 0),
        }),
        { debit: 0, kredit: 0 },
      ),
    [rows],
  );

  const difference = Math.abs(totals.debit - totals.kredit);
  const balanced = difference < 0.01;
  const handlePrint = () => window.print();
  const handlePreview = () =>
    document.getElementById("trial-balance-document")?.scrollIntoView({ behavior: "smooth" });
  const exportRows = () =>
    rows.map((row) => ({
      "Kode Akun": row.kodeRekening,
      "Nama Akun": row.namaRekening,
      Kategori: row.kategori,
      Debit: Number(row.saldoDebit || 0),
      Kredit: Number(row.saldoKredit || 0),
    }));

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const margin = 12;
    let y = 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("KOPERASI SEJAHTERA", margin, y);
    y += 7;
    doc.setFontSize(11);
    doc.text(`Neraca Saldo - Per 31 Desember ${year}`, margin, y);
    y += 10;

    doc.setFontSize(8);
    doc.text("Kode Akun", margin, y);
    doc.text("Nama Akun", margin + 36, y);
    doc.text("Debit", 215, y, { align: "right" });
    doc.text("Kredit", 275, y, { align: "right" });
    y += 4;
    doc.line(margin, y, 285, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    rows.forEach((row) => {
      if (y > 190) {
        doc.addPage();
        y = 16;
      }
      doc.text(row.kodeRekening, margin, y);
      doc.text(row.namaRekening.slice(0, 70), margin + 36, y);
      doc.text(Number(row.saldoDebit) ? formatCurrency(Number(row.saldoDebit)) : "-", 215, y, {
        align: "right",
      });
      doc.text(Number(row.saldoKredit) ? formatCurrency(Number(row.saldoKredit)) : "-", 275, y, {
        align: "right",
      });
      y += 7;
    });

    y += 2;
    doc.line(margin, y, 285, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Total", margin, y);
    doc.text(formatCurrency(totals.debit), 215, y, { align: "right" });
    doc.text(formatCurrency(totals.kredit), 275, y, { align: "right" });
    doc.save(`neraca_saldo_${year}.pdf`);
  };

  const handleDownloadExcel = () => {
    exportToExcel(
      [
        ...exportRows(),
        {
          "Kode Akun": "TOTAL",
          "Nama Akun": "",
          Kategori: "",
          Debit: totals.debit,
          Kredit: totals.kredit,
        },
      ],
      "Neraca Saldo",
      `neraca_saldo_${year}.xlsx`,
    );
  };
  const handleCopyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
  };

  return (
    <div className="space-y-5 text-slate-900">
      <div className="flex flex-wrap items-center justify-end gap-2 lg:-mt-20 lg:mb-12">
        <div className="flex flex-wrap items-center gap-2">
          <ReportActionButton variant="dark" onClick={handlePreview}>
            <Eye size={16} />
            Preview
          </ReportActionButton>
          <ReportActionButton variant="yellow" onClick={handleDownloadPDF}>
            <Download size={16} />
            PDF
          </ReportActionButton>
          <ReportActionButton onClick={handleDownloadExcel}>
            <FileSpreadsheet size={16} />
            Excel
          </ReportActionButton>
          <ReportActionButton onClick={handlePrint}>
            <Printer size={16} />
            Cetak
          </ReportActionButton>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Salin tautan laporan"
          >
            <Copy size={17} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-semibold text-slate-700">
          <span className="mb-1 block">Tahun Laporan</span>
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="h-10 w-36 rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-sky-600"
            placeholder="2026"
          />
        </label>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-400"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Memuat..." : "Tampilkan"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section
        id="trial-balance-document"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <div className="bg-slate-900 px-6 py-8 text-center text-white">
          <h3 className="text-lg font-extrabold">KOPERASI SEJAHTERA</h3>
          <p className="mt-2 text-sm font-bold">Neraca Saldo</p>
          <p className="mt-1 text-xs text-slate-100">Per 31 Desember {year}</p>
          <p className="mt-1 text-xs text-slate-300">Tanggal laporan: {todayLabel()}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-5 py-4 text-left">Kode Akun</th>
                <th className="px-5 py-4 text-left">Nama Akun</th>
                <th className="px-5 py-4 text-right">Debit</th>
                <th className="px-5 py-4 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                    Memuat data neraca saldo...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                    Belum ada saldo untuk tahun ini.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.kodeRekening} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-mono text-slate-700">{row.kodeRekening}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{row.namaRekening}</div>
                      <div className="text-xs capitalize text-slate-400">{row.kategori}</div>
                    </td>
                    <td className="px-5 py-4 text-right font-mono">
                      {Number(row.saldoDebit) ? formatCurrency(Number(row.saldoDebit)) : "-"}
                    </td>
                    <td className="px-5 py-4 text-right font-mono">
                      {Number(row.saldoKredit) ? formatCurrency(Number(row.saldoKredit)) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 font-bold text-white">
                <td colSpan={2} className="px-5 py-4">
                  Total
                </td>
                <td className="px-5 py-4 text-right font-mono">
                  {formatCurrency(totals.debit)}
                </td>
                <td className="px-5 py-4 text-right font-mono">
                  {formatCurrency(totals.kredit)}
                </td>
              </tr>
              <tr className="bg-sky-50 text-slate-950">
                <td colSpan={2} className="px-5 py-4 font-semibold">
                  {balanced ? "Neraca Seimbang" : "Neraca Belum Seimbang"}
                </td>
                <td colSpan={2} className="px-5 py-4 text-right font-mono">
                  Selisih: {formatCurrency(difference)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
