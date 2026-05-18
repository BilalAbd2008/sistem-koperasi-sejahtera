"use client";

import { useEffect, useState } from "react";
import { FinancialReportShell } from "@/components/accounting";

interface ShuData {
  periode: string;
  totalRevenues: number;
  totalExpenses: number;
  netIncome: number;
}

const currentPeriod = () =>
  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function BendaharaShuPage() {
  const [periode, setPeriode] = useState(currentPeriod());
  const [data, setData] = useState<ShuData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ periode, system: "old" });
      const response = await fetch(`/api/laporan-keuangan/laba-rugi?${params}`);
      const result = await response.json();
      setData(result.data?.old || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <FinancialReportShell
      eyebrow="Laporan Keuangan"
      title="SHU"
      description="Ringkasan sisa hasil usaha dari pendapatan dan beban koperasi."
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="text-sm font-semibold text-slate-700">
            <span className="mb-1 block">Periode</span>
            <input
              value={periode}
              onChange={(event) => setPeriode(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              placeholder="2026-05"
            />
          </label>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
          >
            {loading ? "Memuat..." : "Tampilkan"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-500">Pendapatan</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(data?.totalRevenues || 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-500">Beban</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(data?.totalExpenses || 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-700">SHU Berjalan</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {formatCurrency(data?.netIncome || 0)}
            </p>
          </div>
        </div>
      </div>
    </FinancialReportShell>
  );
}
