'use client';

import { useState, useEffect } from 'react';

interface LedgerEntry {
  id: number;
  tanggal_jurnal?: string;
  tanggal_transaksi?: string;
  nomor_jurnal?: string;
  kode_rekening?: string;
  posisi?: string;
  jumlah: number | string;
  keterangan: string;
  nama_anggota?: string;
  debit: number | string | null;
  kredit: number | string | null;
  saldo: number | string | null;
}

interface Rekening {
  kode_rekening: string;
  nama_rekening: string;
  kategori: string;
}

const toNumber = (value: number | string | null | undefined) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatCurrency = (value: number | string | null | undefined) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Math.abs(toNumber(value)));
};

export default function LedgerViewer() {
  const [rekening, setRekening] = useState<Rekening[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('1-1100');
  const [periode, setPeriode] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [system, setSystem] = useState<'new' | 'old' | 'all'>('old');

  useEffect(() => {
    fetchRekening();
  }, [system, periode]);

  useEffect(() => {
    if (selectedAccount) {
      fetchLedger();
    }
  }, [selectedAccount, periode, system]);

  const fetchRekening = async () => {
    if (system !== 'old') {
      try {
        const res = await fetch('/api/rekening?status=aktif');
        const data = await res.json();
        if (res.ok && data.data?.length > 0) {
          setRekening(data.data || []);
          setSelectedAccount(data.data[0].kode_rekening);
          return;
        }
      } catch (error) {
        console.error('Error fetching rekening:', error);
      }
    }

    try {
      const params = new URLSearchParams({ periode });
      const res = await fetch(`/api/laporan-keuangan/trial-balance?${params}`);
      const data = await res.json();
      const legacyAccounts = (data.data || []).map(
        (item: { kodeRekening: string; namaRekening: string; kategori: string }) => ({
          kode_rekening: item.namaRekening,
          nama_rekening: item.namaRekening,
          kategori: item.kategori,
        }),
      );
      setRekening(legacyAccounts);
      if (legacyAccounts.length > 0) {
        setSelectedAccount(legacyAccounts[0].kode_rekening);
      }
    } catch (error) {
      console.error('Error fetching legacy rekening:', error);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        akun: selectedAccount,
        periode,
        system,
      });

      const res = await fetch(`/api/buku-besar?${params}`);
      const data = await res.json();
      const payload = data.data || {};

      if (system === 'new') {
        setEntries((payload.new || []) as LedgerEntry[]);
      } else if (system === 'old') {
        setEntries((payload.old || []) as LedgerEntry[]);
      } else {
        const combined = [...(payload.old || []), ...(payload.new || [])].sort(
          (a, b) =>
            new Date(a.tanggal_jurnal || a.tanggal_transaksi).getTime() -
            new Date(b.tanggal_jurnal || b.tanggal_transaksi).getTime()
        );
        setEntries(combined as LedgerEntry[]);
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
      alert('Error loading ledger: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  const selectedAccountName =
    rekening.find((r) => r.kode_rekening === selectedAccount)?.nama_rekening || '-';

  const totalDebit = entries.reduce((sum, e) => sum + toNumber(e.debit), 0);
  const totalKredit = entries.reduce((sum, e) => sum + toNumber(e.kredit), 0);
  const finalBalance = totalDebit - totalKredit;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Buku Besar (Ledger)</h1>

      {/* Filter */}
      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Rekening</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          >
            {rekening.map((r) => (
              <option key={r.kode_rekening} value={r.kode_rekening}>
                {r.kode_rekening} - {r.nama_rekening}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Periode</label>
          <input
            type="text"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            placeholder="2025-05"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Sistem</label>
          <select
            value={system}
            onChange={(e) => setSystem(e.target.value as any)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          >
            <option value="old">Sistem Lama</option>
            <option value="new">Sistem Baru</option>
            <option value="all">Gabungan</option>
          </select>
        </div>

        <button
          onClick={fetchLedger}
          disabled={loading}
          className="self-end rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
        >
          {loading ? 'Memuat...' : 'Muat'}
        </button>
      </div>

      {/* Account Info */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="mb-2 text-lg font-bold text-slate-900">{selectedAccountName}</h2>
        <p className="text-sm text-slate-600">
          Kode: <span className="font-mono">{selectedAccount}</span>
        </p>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="px-4 py-3 text-left">Tanggal</th>
              <th className="px-4 py-3 text-left">Nomor Referensi</th>
              <th className="px-4 py-3 text-left">Keterangan</th>
              <th className="px-4 py-3 text-left">Anggota</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Kredit</th>
              <th className="px-4 py-3 text-right font-bold">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Memuat data...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {new Date(
                      entry.tanggal_jurnal || entry.tanggal_transaksi || ''
                    ).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {entry.nomor_jurnal || entry.id}
                  </td>
                  <td className="px-4 py-3">{entry.keterangan}</td>
                  <td className="px-4 py-3 text-sm">{entry.nama_anggota || '-'}</td>
                  <td className="px-4 py-3 text-right font-mono text-sky-600">
                    {toNumber(entry.debit) > 0 ? formatCurrency(entry.debit) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">
                    {toNumber(entry.kredit) > 0 ? formatCurrency(entry.kredit) : '-'}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-bold ${
                      toNumber(entry.saldo) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(entry.saldo)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold">
              <td colSpan={4} className="px-4 py-3 text-right">
                TOTAL
              </td>
              <td className="px-4 py-3 text-right font-mono text-sky-600">
                {formatCurrency(totalDebit)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-red-600">
                {formatCurrency(totalKredit)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-lg">
                {formatCurrency(finalBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Debit</p>
          <p className="text-lg font-bold text-sky-600">{formatCurrency(totalDebit)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Kredit</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totalKredit)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Saldo Akhir</p>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(finalBalance)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Tipe Normal</p>
          <p className="text-lg font-bold capitalize text-slate-900">
            {rekening.find((r) => r.kode_rekening === selectedAccount)?.kategori || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
