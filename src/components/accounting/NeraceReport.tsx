"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Eye, Printer, RefreshCw } from "lucide-react";

interface BalanceSheetItem {
  kodeRekening: string;
  namaRekening: string;
  kategori?: string;
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

type BalanceRow =
  | {
      type: "section";
      leftLabel: string;
      rightLabel: string;
    }
  | {
      type: "account";
      left?: BalanceSheetItem;
      right?: BalanceSheetItem;
    }
  | {
      type: "total";
      leftLabel: string;
      leftAmount: number;
      rightLabel: string;
      rightAmount: number;
      grand?: boolean;
    };

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

const accountText = (item?: BalanceSheetItem) => {
  if (!item) return "";
  return `${item.namaRekening}${item.kodeRekening ? ` (${item.kodeRekening})` : ""}`;
};

export default function NeraceReport() {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [year, setYear] = useState(currentYear());
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

      const res = await fetch(`/api/laporan-keuangan/neraca?${params}`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal memuat neraca");
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

  const handlePrint = () => window.print();
  const handlePreview = () =>
    document.getElementById("balance-report-document")?.scrollIntoView({ behavior: "smooth" });
  const handleDownloadPDF = () => window.print();
  const handleCopyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
  };

  const totalLiabilitiesEquity = (data?.totalLiabilities || 0) + (data?.totalEquity || 0);
  const difference = Math.abs((data?.totalAssets || 0) - totalLiabilitiesEquity);
  const isBalanced = difference < 0.01;

  const rows = useMemo<BalanceRow[]>(() => {
    const assets = data?.assets || [];
    const liabilities = data?.liabilities || [];
    const equity = data?.equity || [];
    const maxOperationalRows = Math.max(assets.length, liabilities.length);
    const accountRows: BalanceRow[] = Array.from({ length: maxOperationalRows }, (_, index) => ({
      type: "account",
      left: assets[index],
      right: liabilities[index],
    }));
    const maxEquityRows = Math.max(1, equity.length);
    const equityRows: BalanceRow[] = Array.from({ length: maxEquityRows }, (_, index) => ({
      type: "account",
      right: equity[index],
    }));

    return [
      { type: "section", leftLabel: "ASET", rightLabel: "LIABILITAS" },
      ...accountRows,
      {
        type: "total",
        leftLabel: "Total Aset",
        leftAmount: data?.totalAssets || 0,
        rightLabel: "Total Liabilitas",
        rightAmount: data?.totalLiabilities || 0,
      },
      { type: "section", leftLabel: "", rightLabel: "EKUITAS" },
      ...equityRows,
      {
        type: "total",
        leftLabel: "TOTAL ASET",
        leftAmount: data?.totalAssets || 0,
        rightLabel: "TOTAL LIABILITAS & EKUITAS",
        rightAmount: totalLiabilitiesEquity,
        grand: true,
      },
    ];
  }, [data, totalLiabilitiesEquity]);

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
            Download
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
        id="balance-report-document"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <div className="bg-slate-900 px-6 py-8 text-center text-white">
          <h3 className="text-lg font-extrabold">KOPERASI SEJAHTERA</h3>
          <p className="mt-2 text-sm font-bold">Laporan Posisi Keuangan</p>
          <p className="mt-1 text-xs text-slate-100">Per 31 Desember {year}</p>
          <p className="mt-1 text-xs text-slate-300">Tanggal laporan: {todayLabel()}</p>
          <p className="mt-1 text-xs text-slate-300">
            Disajikan dalam Rupiah, kecuali dinyatakan lain
          </p>
        </div>

        <div className="overflow-x-auto p-6">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="w-[35%] px-4 py-3 text-left">Aset</th>
                <th className="w-[15%] px-4 py-3 text-right">Jumlah</th>
                <th className="w-[35%] border-l border-slate-200 px-4 py-3 text-left">
                  Liabilitas dan Ekuitas
                </th>
                <th className="w-[15%] px-4 py-3 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                if (row.type === "section") {
                  return (
                    <tr key={`section-${index}`} className="bg-sky-50 font-extrabold text-slate-950">
                      <td className="px-4 py-3">{row.leftLabel}</td>
                      <td className="px-4 py-3" />
                      <td className="border-l border-slate-200 px-4 py-3">{row.rightLabel}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  );
                }

                if (row.type === "total") {
                  return (
                    <tr
                      key={`total-${index}`}
                      className={`font-extrabold ${
                        row.grand
                          ? "border-y border-slate-900 bg-sky-50 text-slate-950"
                          : "border-y border-slate-200 text-slate-950"
                      }`}
                    >
                      <td className="px-4 py-4">{row.leftLabel}</td>
                      <td className="px-4 py-4 text-right font-mono">
                        {formatCurrency(row.leftAmount)}
                      </td>
                      <td className="border-l border-slate-200 px-4 py-4">{row.rightLabel}</td>
                      <td className="px-4 py-4 text-right font-mono">
                        {formatCurrency(row.rightAmount)}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`account-${index}`} className="border-b border-slate-100">
                    <td className="px-4 py-3 pl-8 text-slate-700">
                      {accountText(row.left) || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {row.left ? formatCurrency(row.left.saldo) : "-"}
                    </td>
                    <td className="border-l border-slate-200 px-4 py-3 pl-8 text-slate-700">
                      {accountText(row.right) || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {row.right ? formatCurrency(row.right.saldo) : "-"}
                    </td>
                  </tr>
                );
              })}

              {!loading && !data ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Belum ada data neraca untuk tahun ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-800">
          <p className="font-bold">Status Verifikasi</p>
          <p className="mt-2">{isBalanced ? "Neraca Seimbang" : "Neraca Belum Seimbang"}</p>
          <p className="mt-1 text-xs">Selisih: {formatCurrency(difference)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-bold">Total Aset</p>
          <p className="mt-2 font-mono text-lg font-extrabold">
            {formatCurrency(data?.totalAssets || 0)}
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-800">
          <p className="font-bold">Total Liabilitas &amp; Ekuitas</p>
          <p className="mt-2 font-mono text-lg font-extrabold">
            {formatCurrency(totalLiabilitiesEquity)}
          </p>
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="text-center">
          <div className="border-t border-slate-900 pt-2 text-sm font-semibold">Ketua</div>
          <p className="mt-1 text-xs text-slate-500">Koperasi Sejahtera</p>
        </div>
        <div className="text-center">
          <div className="border-t border-slate-900 pt-2 text-sm font-semibold">Bendahara</div>
          <p className="mt-1 text-xs text-slate-500">Koperasi Sejahtera</p>
        </div>
      </div>
    </div>
  );
}
