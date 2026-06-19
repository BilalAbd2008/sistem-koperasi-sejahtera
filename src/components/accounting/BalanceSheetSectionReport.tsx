"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { exportToExcel } from "@/lib/export";

type SectionMode = "assets" | "liabilities";

interface BalanceSheetItem {
  kodeRekening: string;
  namaRekening: string;
  saldo: number;
}

interface BalanceSheetData {
  assets: BalanceSheetItem[];
  liabilities: BalanceSheetItem[];
  equity: BalanceSheetItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  periode: string;
}

const currentYear = () => String(new Date().getFullYear());

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function BalanceSheetSectionReport({ mode }: { mode: SectionMode }) {
  const [year, setYear] = useState(currentYear());
  const [data, setData] = useState<BalanceSheetData | null>(null);
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
      const response = await fetch(`/api/laporan-keuangan/neraca?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal memuat laporan");
      }

      setData(result.data?.new || null);
    } catch (err) {
      setError(String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return mode === "assets" ? data.assets : [...data.liabilities, ...data.equity];
  }, [data, mode]);

  const total =
    mode === "assets"
      ? data?.totalAssets || 0
      : (data?.totalLiabilities || 0) + (data?.totalEquity || 0);

  const title = mode === "assets" ? "BS - Aset (BS-A)" : "BS - Liabilitas & Ekuitas (BS-L)";
  const subtitle =
    mode === "assets"
      ? "Daftar posisi aset koperasi per periode"
      : "Daftar posisi kewajiban anggota dan ekuitas koperasi";
  const filePrefix = mode === "assets" ? "bs_aset" : "bs_liabilitas_ekuitas";
  const sheetName = mode === "assets" ? "BS Aset" : "BS Liabilitas Ekuitas";

  const exportRows = () => [
    ...rows.map((item) => ({
      "Kode Akun": item.kodeRekening,
      "Nama Rekening": item.namaRekening,
      Saldo: Number(item.saldo || 0),
    })),
    { "Kode Akun": "TOTAL", "Nama Rekening": `Total ${mode === "assets" ? "Aset" : "Liabilitas + Ekuitas"}`, Saldo: total },
  ];

  const handleDownloadExcel = () => {
    exportToExcel(exportRows(), sheetName, `${filePrefix}_${year}.xlsx`);
  };

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const marginX = 14;
    let y = 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("KOPERASI PRI BDAPK CINAGARA", marginX, y);
    y += 7;
    doc.setFontSize(11);
    doc.text(`${title} - Per 31 Desember ${year}`, marginX, y);
    y += 10;

    doc.setFontSize(9);
    doc.text("Kode", marginX, y);
    doc.text("Nama Rekening", marginX + 32, y);
    doc.text("Saldo", 196, y, { align: "right" });
    y += 4;
    doc.line(marginX, y, 196, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    rows.forEach((item) => {
      if (y > 275) {
        doc.addPage();
        y = 18;
      }
      doc.text(item.kodeRekening, marginX, y);
      doc.text(item.namaRekening.slice(0, 70), marginX + 32, y);
      doc.text(formatCurrency(Number(item.saldo || 0)), 196, y, { align: "right" });
      y += 7;
    });

    y += 2;
    doc.line(marginX, y, 196, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Total", marginX, y);
    doc.text(formatCurrency(total), 196, y, { align: "right" });
    doc.save(`${filePrefix}_${year}.pdf`);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-700">
            <span className="mb-1 block text-xs font-semibold">Tahun</span>
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
              placeholder="2026"
            />
          </label>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Muat
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <Download size={16} />
            PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
        </div>
      </div>

      {error ? <div className="m-5 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="p-6">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total {mode === "assets" ? "Aset" : "Liabilitas + Ekuitas"}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(total)}</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="px-4 py-3 text-left">Kode</th>
                <th className="px-4 py-3 text-left">Nama Rekening</th>
                <th className="px-4 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    Belum ada saldo untuk periode ini.
                  </td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.kodeRekening} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{item.kodeRekening}</td>
                    <td className="px-4 py-3">{item.namaRekening}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(Number(item.saldo || 0))}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td colSpan={2} className="px-4 py-3 text-right">
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
