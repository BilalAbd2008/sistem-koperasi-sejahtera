"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { exportToExcel } from "@/lib/export";

interface IncomeItem {
  kodeRekening: string;
  namaRekening: string;
  amount: number;
}

interface IncomeStatementData {
  revenues: IncomeItem[];
  expenses: IncomeItem[];
  totalRevenues: number;
  totalExpenses: number;
  netIncome: number;
  periode: string;
}

const currentYear = () => new Date().getFullYear();

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const defaultStartDate = () => `${currentYear()}-01-01`;
const defaultEndDate = () => `${currentYear()}-12-31`;

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

const formatAmount = (value: number, negative = false) => {
  const amount = formatCurrency(Math.abs(value));
  return negative && value !== 0 ? `(${amount})` : amount;
};

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

export default function LabaRugiReport() {
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        periode_awal: startDate,
        periode_akhir: endDate,
        system: "new",
      });
      const res = await fetch(`/api/laporan-keuangan/laba-rugi?${params}`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal memuat laporan laba rugi");
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

  const handleCopyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
  };
  const reportPeriodLabel = `${new Date(startDate).toLocaleDateString("id-ID")} - ${new Date(
    endDate,
  ).toLocaleDateString("id-ID")}`;

  const reportRows = useMemo(() => {
    const revenues = data?.revenues || [];
    const expenses = data?.expenses || [];

    return {
      revenues,
      expenses,
      hasRows: revenues.length > 0 || expenses.length > 0,
    };
  }, [data]);

  const operatingProfit = (data?.totalRevenues || 0) - (data?.totalExpenses || 0);
  const margin =
    data && data.totalRevenues > 0
      ? ((data.netIncome / data.totalRevenues) * 100).toFixed(2)
      : "0.00";

  const exportRows = () => [
    ...(data?.revenues || []).map((item) => ({
      Bagian: "Pendapatan",
      "Kode Akun": item.kodeRekening,
      "Nama Akun": item.namaRekening,
      Jumlah: Number(item.amount || 0),
    })),
    {
      Bagian: "Pendapatan",
      "Kode Akun": "TOTAL",
      "Nama Akun": "Total Pendapatan",
      Jumlah: data?.totalRevenues || 0,
    },
    ...(data?.expenses || []).map((item) => ({
      Bagian: "Beban Operasional",
      "Kode Akun": item.kodeRekening,
      "Nama Akun": item.namaRekening,
      Jumlah: Number(item.amount || 0),
    })),
    {
      Bagian: "Beban Operasional",
      "Kode Akun": "TOTAL",
      "Nama Akun": "Total Beban Operasional",
      Jumlah: data?.totalExpenses || 0,
    },
    {
      Bagian: "Laba Rugi",
      "Kode Akun": "TOTAL",
      "Nama Akun": "Laba Bersih Tahun Berjalan",
      Jumlah: data?.netIncome || 0,
    },
  ];

  const handleDownloadExcel = () => {
    exportToExcel(exportRows(), "Laba Rugi", `laba_rugi_${startDate}_${endDate}.xlsx`);
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
    doc.text(`Laporan Laba Rugi - ${reportPeriodLabel}`, marginX, y);
    y += 10;

    const writeRow = (label: string, amount: number, bold = false, indent = 0) => {
      if (y > 275) {
        doc.addPage();
        y = 18;
      }
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(9);
      doc.text(label.slice(0, 92), marginX + indent, y);
      doc.text(formatCurrency(amount), 196, y, { align: "right" });
      y += 7;
    };

    writeRow("Pendapatan", 0, true);
    (data?.revenues || []).forEach((item) =>
      writeRow(`${item.namaRekening} (${item.kodeRekening})`, Number(item.amount || 0), false, 5),
    );
    writeRow("Total Pendapatan", data?.totalRevenues || 0, true);
    y += 4;
    writeRow("Beban Operasional", 0, true);
    (data?.expenses || []).forEach((item) =>
      writeRow(`${item.namaRekening} (${item.kodeRekening})`, Number(item.amount || 0), false, 5),
    );
    writeRow("Total Beban Operasional", data?.totalExpenses || 0, true);
    writeRow("Laba Bersih Tahun Berjalan", data?.netIncome || 0, true);

    doc.save(`laba_rugi_${startDate}_${endDate}.pdf`);
  };

  return (
    <div className="space-y-5 text-slate-900">
      <div className="flex flex-wrap items-center justify-end gap-2 lg:-mt-20 lg:mb-12">
        <div className="flex flex-wrap items-center gap-2">
          <ReportActionButton variant="yellow" onClick={handleDownloadPDF}>
            <Download size={16} />
            PDF
          </ReportActionButton>
          <ReportActionButton onClick={handleDownloadExcel}>
            <FileSpreadsheet size={16} />
            Excel
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
          <span className="mb-1 block">Tanggal Awal</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value || toDateInput(new Date()))}
            className="h-10 w-40 rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-sky-600"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          <span className="mb-1 block">Tanggal Akhir</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value || toDateInput(new Date()))}
            className="h-10 w-40 rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:border-sky-600"
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
        id="income-report-document"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <div className="bg-slate-900 px-6 py-8 text-center text-white">
          <h3 className="text-lg font-extrabold">KOPERASI PRI BDAPK CINAGARA</h3>
          <p className="mt-2 text-sm font-bold">Laporan Laba Rugi</p>
          <p className="mt-1 text-xs text-slate-100">
            Periode {reportPeriodLabel}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Tanggal laporan: {todayLabel()}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Disajikan dalam Rupiah, kecuali dinyatakan lain
          </p>
        </div>

        <div className="p-6">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-3 font-bold text-slate-950">Pendapatan</td>
                <td className="py-3 text-right font-mono" />
              </tr>
              {reportRows.revenues.length === 0 ? (
                <tr className="border-b border-slate-100">
                  <td className="py-3 pl-5 text-slate-500">Belum ada pendapatan</td>
                  <td className="py-3 text-right font-mono text-slate-500">-</td>
                </tr>
              ) : (
                reportRows.revenues.map((item) => (
                  <tr key={item.kodeRekening} className="border-b border-slate-100">
                    <td className="py-3 pl-5 text-slate-700">
                      {item.namaRekening}
                      <span className="ml-2 font-mono text-xs text-slate-400">
                        {item.kodeRekening}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))
              )}

              <tr className="border-b border-slate-900">
                <td className="py-3 font-bold">Total Pendapatan</td>
                <td className="py-3 text-right font-mono font-bold">
                  {formatCurrency(data?.totalRevenues || 0)}
                </td>
              </tr>

              <tr>
                <td className="pt-7 pb-3 font-bold text-slate-950">Beban Operasional</td>
                <td className="pt-7 pb-3 text-right font-mono" />
              </tr>
              {reportRows.expenses.length === 0 ? (
                <tr className="border-b border-slate-100">
                  <td className="py-3 pl-5 text-slate-500">Belum ada beban</td>
                  <td className="py-3 text-right font-mono text-slate-500">-</td>
                </tr>
              ) : (
                reportRows.expenses.map((item) => (
                  <tr key={item.kodeRekening} className="border-b border-slate-100">
                    <td className="py-3 pl-5 text-slate-700">
                      {item.namaRekening}
                      <span className="ml-2 font-mono text-xs text-slate-400">
                        {item.kodeRekening}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono">
                      {formatAmount(item.amount, true)}
                    </td>
                  </tr>
                ))
              )}
              <tr className="border-b border-slate-300">
                <td className="py-3 font-bold">Total Beban Operasional</td>
                <td className="py-3 text-right font-mono font-bold">
                  {formatAmount(data?.totalExpenses || 0, true)}
                </td>
              </tr>

              <tr className="border-b border-slate-900">
                <td className="py-4 font-bold">Laba Operasional</td>
                <td className="py-4 text-right font-mono font-bold">
                  {formatCurrency(operatingProfit)}
                </td>
              </tr>

              <tr className="bg-sky-50">
                <td className="rounded-l-lg px-4 py-4 font-extrabold text-slate-950">
                  Laba Bersih Tahun Berjalan
                </td>
                <td className="rounded-r-lg px-4 py-4 text-right font-mono font-extrabold text-slate-950">
                  {formatCurrency(data?.netIncome || 0)}
                </td>
              </tr>

              {!loading && !reportRows.hasRows ? (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-slate-500">
                    Belum ada transaksi laba rugi untuk rentang tanggal ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="mt-24 grid gap-6 md:grid-cols-2">
            <div className="text-center">
              <div className="border-t border-slate-900 pt-2 text-sm font-semibold">Ketua</div>
              <p className="mt-1 text-xs text-slate-500">Koperasi PRI BDAPK Cinagara</p>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-900 pt-2 text-sm font-semibold">Bendahara</div>
              <p className="mt-1 text-xs text-slate-500">Koperasi PRI BDAPK Cinagara</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-bold">Catatan Laporan</p>
          <p className="mt-2">
            Laporan ini merangkum pendapatan dan beban yang tercatat pada periode {reportPeriodLabel}.
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-800">
          <p className="font-bold">Ringkasan</p>
          <div className="mt-2 grid gap-1">
            <div className="flex justify-between gap-4">
              <span>Total Pendapatan</span>
              <span className="font-mono font-bold">{formatCurrency(data?.totalRevenues || 0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Total Beban</span>
              <span className="font-mono font-bold">{formatCurrency(data?.totalExpenses || 0)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Margin Laba</span>
              <span className="font-mono font-bold">{margin}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
