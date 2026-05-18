'use client';

import { useState, useEffect } from 'react';
import { Download, Printer } from 'lucide-react';

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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function NeraceReport() {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periode_awal: `${year}-01-01`,
        periode_akhir: `${year}-12-31`,
        system: 'old',
      });

      const res = await fetch(`/api/laporan-keuangan/neraca?${params}`);
      const result = await res.json();
      const payload = result.data || {};

      setData(payload.old);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading report: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    alert('Fitur download PDF akan diimplementasikan');
  };

  if (!data)
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p>Loading...</p>
      </div>
    );

  const isBalanced = Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Neraca Posisi Keuangan</h1>
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

      {/* Filter */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Tahun</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2026"
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          />
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-end rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
        >
          {loading ? 'Loading...' : 'Tampilkan'}
        </button>
      </div>

      {/* Status */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm">
          <strong>Tahun:</strong> {year} | 
          <strong className="ml-4">Status Neraca:</strong>
          <span className={`ml-2 ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
            {isBalanced ? 'SEIMBANG' : 'TIDAK SEIMBANG'}
          </span>
        </p>
      </div>

      {/* Report */}
      <div className="grid grid-cols-2 gap-8">
        {/* Left: Assets & Liabilities */}
        <div>
          <h2 className="text-lg font-bold mb-4 border-b-2 pb-2">ASET (Kiri)</h2>

          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-blue-700">Aset</h3>
            {data.assets.map((item) => (
              <div key={item.kodeRekening} className="flex justify-between mb-2">
                <span className="text-sm">
                  {item.kodeRekening} - {item.namaRekening}
                </span>
                <span className="font-mono">{formatCurrency(item.saldo)}</span>
              </div>
            ))}
          </div>

          <div className="border-t-2 pt-3 mb-6">
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL ASET</span>
              <span className="font-mono">{formatCurrency(data.totalAssets)}</span>
            </div>
          </div>
        </div>

        {/* Right: Liabilities & Equity */}
        <div>
          <h2 className="text-lg font-bold mb-4 border-b-2 pb-2">LIABILITAS & EKUITAS (Kanan)</h2>

          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-red-700">Liabilitas</h3>
            {data.liabilities.map((item) => (
              <div key={item.kodeRekening} className="flex justify-between mb-2">
                <span className="text-sm">
                  {item.kodeRekening} - {item.namaRekening}
                </span>
                <span className="font-mono">{formatCurrency(item.saldo)}</span>
              </div>
            ))}
          </div>

          <div className="border-b pb-3 mb-6">
            <div className="flex justify-between font-bold">
              <span>Total Liabilitas</span>
              <span className="font-mono">{formatCurrency(data.totalLiabilities)}</span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-green-700">Ekuitas</h3>
            {data.equity.map((item) => (
              <div key={item.kodeRekening} className="flex justify-between mb-2">
                <span className="text-sm">
                  {item.kodeRekening} - {item.namaRekening}
                </span>
                <span className="font-mono">{formatCurrency(item.saldo)}</span>
              </div>
            ))}
          </div>

          <div className="border-t-2 pt-3">
            <div className="flex justify-between font-bold">
              <span>Total Ekuitas</span>
              <span className="font-mono">{formatCurrency(data.totalEquity)}</span>
            </div>
          </div>

          <div className="border-t-2 pt-3 mt-6">
            <div className="flex justify-between font-bold text-lg">
              <span>TOTAL LIABILITAS + EKUITAS</span>
              <span className="font-mono">
                {formatCurrency(data.totalLiabilities + data.totalEquity)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verification */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-bold mb-2">Verifikasi Neraca</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Aset</p>
            <p className="font-bold text-lg">{formatCurrency(data.totalAssets)}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Liabilitas + Ekuitas</p>
            <p className="font-bold text-lg">
              {formatCurrency(data.totalLiabilities + data.totalEquity)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Selisih</p>
            <p
              className={`font-bold text-lg ${
                isBalanced ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(
                Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity))
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p>
          <strong>Catatan:</strong> Neraca ini menampilkan posisi keuangan pada akhir tahun
          {year}. Data diambil dari jurnal yang sudah di-posting dan saldo telah dikurangi
          dengan akun kontra.
        </p>
      </div>
    </div>
  );
}
