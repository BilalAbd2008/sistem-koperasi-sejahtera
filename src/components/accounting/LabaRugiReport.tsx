"use client";

import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function LabaRugiReport() {
  const [data, setData] = useState<IncomeStatementData | null>(null);
  const [periode, setPeriode] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  );
  const [loading, setLoading] = useState(false);
  const [system, setSystem] = useState<"new" | "old" | "all">("old");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ periode, system });
      const res = await fetch(`/api/laporan-keuangan/laba-rugi?${params}`);
      const result = await res.json();
      const payload = result.data || {};
      setData(system === "new" ? payload.new : payload.old || payload.new);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error loading report: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handlePrint = () => window.print();
  const handleDownloadPDF = () => alert("Fitur download PDF akan diimplementasikan");

  if (!data) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
        Memuat laporan...
      </div>
    );
  }

  const profitMargin =
    data.totalRevenues > 0
      ? ((data.netIncome / data.totalRevenues) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Laba Rugi</h1>
          <p className="mt-1 text-sm text-slate-500">Periode: {data.periode}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Printer size={20} />
            Cetak
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Download size={20} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Periode</label>
          <input
            type="text"
            value={periode}
            onChange={(event) => setPeriode(event.target.value)}
            placeholder="2026-05"
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Sistem</label>
          <select
            value={system}
            onChange={(event) => setSystem(event.target.value as "new" | "old" | "all")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          >
            <option value="old">Sistem Lama (Legacy)</option>
            <option value="new">Sistem Baru (Modern)</option>
            <option value="all">Gabungan</option>
          </select>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-end rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
        >
          {loading ? "Memuat..." : "Tampilkan"}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 p-5">
            <h2 className="mb-4 border-b border-slate-200 pb-2 text-lg font-bold text-slate-900">
              Pendapatan
            </h2>
            {data.revenues.length === 0 ? (
              <p className="italic text-slate-500">Tidak ada pendapatan</p>
            ) : (
              <>
                {data.revenues.map((item) => (
                  <div
                    key={item.kodeRekening}
                    className="mb-2 flex justify-between gap-4 text-sm text-slate-700"
                  >
                    <span>
                      {item.kodeRekening} - {item.namaRekening}
                    </span>
                    <span className="font-mono text-slate-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold">
                  <span>Total Pendapatan</span>
                  <span className="font-mono text-emerald-600">
                    {formatCurrency(data.totalRevenues)}
                  </span>
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 p-5">
            <h2 className="mb-4 border-b border-slate-200 pb-2 text-lg font-bold text-slate-900">
              Beban Operasional
            </h2>
            {data.expenses.length === 0 ? (
              <p className="italic text-slate-500">Tidak ada beban</p>
            ) : (
              <>
                {data.expenses.map((item) => (
                  <div
                    key={item.kodeRekening}
                    className="mb-2 flex justify-between gap-4 text-sm text-slate-700"
                  >
                    <span>
                      {item.kodeRekening} - {item.namaRekening}
                    </span>
                    <span className="font-mono text-slate-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold">
                  <span>Total Beban</span>
                  <span className="font-mono text-red-600">
                    {formatCurrency(data.totalExpenses)}
                  </span>
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-700">Laba/Rugi Bersih</p>
            <p
              className={`mt-2 font-mono text-2xl font-bold ${
                data.netIncome >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {formatCurrency(data.netIncome)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-3 font-bold text-slate-900">Ringkasan Kinerja</h3>
            <div className="grid gap-4 text-sm">
              <div>
                <p className="text-slate-500">Total Pendapatan</p>
                <p className="font-bold text-emerald-600">
                  {formatCurrency(data.totalRevenues)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Total Beban</p>
                <p className="font-bold text-red-600">{formatCurrency(data.totalExpenses)}</p>
              </div>
              <div>
                <p className="text-slate-500">Profit Margin</p>
                <p className="font-bold text-slate-900">{profitMargin}%</p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <p className={`font-bold ${data.netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {data.netIncome >= 0 ? "UNTUNG" : "RUGI"}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
        <p>
          <strong>Catatan:</strong> Laporan laba rugi mengikuti transaksi simpan pinjam
          pada periode {data.periode} dan dapat diverifikasi melalui buku besar.
        </p>
      </div>
    </div>
  );
}
