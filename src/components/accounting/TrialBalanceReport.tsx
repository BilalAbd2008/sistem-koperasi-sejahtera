"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

interface TrialBalanceRow {
  kodeRekening: string;
  namaRekening: string;
  kategori: string;
  saldoDebit: number;
  saldoKredit: number;
}

const currentYear = () => String(new Date().getFullYear());

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

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
        system: "old",
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

  const balanced = Math.abs(totals.debit - totals.kredit) < 0.01;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Neraca Saldo</h2>
          <p className="mt-1 text-sm text-slate-500">Ringkasan debit dan kredit per rekening</p>
        </div>
        <div className="flex items-end gap-3">
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
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-200 p-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total Debit</p>
          <p className="mt-1 font-semibold text-slate-900">{formatCurrency(totals.debit)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total Kredit</p>
          <p className="mt-1 font-semibold text-slate-900">{formatCurrency(totals.kredit)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Status</p>
          <p className={`mt-1 font-semibold ${balanced ? "text-green-700" : "text-red-700"}`}>
            {balanced ? "Seimbang" : `Selisih ${formatCurrency(Math.abs(totals.debit - totals.kredit))}`}
          </p>
        </div>
      </div>

      {error ? <div className="m-5 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="px-4 py-3 text-left">Kode</th>
              <th className="px-4 py-3 text-left">Nama Rekening</th>
              <th className="px-4 py-3 text-left">Kategori</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Memuat data...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Belum ada saldo untuk periode ini.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.kodeRekening} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{row.kodeRekening}</td>
                  <td className="px-4 py-3">{row.namaRekening}</td>
                  <td className="px-4 py-3 capitalize text-slate-500">{row.kategori}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {Number(row.saldoDebit) ? formatCurrency(Number(row.saldoDebit)) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {Number(row.saldoKredit) ? formatCurrency(Number(row.saldoKredit)) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold text-slate-900">
              <td colSpan={3} className="px-4 py-3 text-right">
                Total
              </td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.debit)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.kredit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
