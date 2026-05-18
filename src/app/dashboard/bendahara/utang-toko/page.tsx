"use client";

import { FinancialReportShell } from "@/components/accounting";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function BendaharaUtangTokoPage() {
  return (
    <FinancialReportShell
      eyebrow="Simpan Pinjam"
      title="Utang Toko"
      description="Pencatatan utang toko anggota yang terhubung dengan monitoring bendahara."
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Daftar Utang Toko</h2>
            <p className="mt-1 text-sm text-slate-500">
              Modul ini disiapkan mengikuti desain simpan pinjam.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            + Tambah Utang
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            ["Total Utang", formatCurrency(0)],
            ["Belum Lunas", "0"],
            ["Jatuh Tempo", "0"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4">Nasabah</th>
                <th className="px-6 py-4">Toko</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Belum ada data utang toko.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </FinancialReportShell>
  );
}
