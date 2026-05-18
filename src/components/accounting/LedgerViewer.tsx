'use client';

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';

interface LedgerEntry {
  id: number;
  tanggal_jurnal?: string;
  tanggal_transaksi?: string;
  nomor_jurnal?: string;
  akun?: string;
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

const toDateInput = (value: Date) => value.toISOString().slice(0, 10);

const firstDayOfMonth = () => {
  const now = new Date();
  return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
};

const lastDayOfMonth = () => {
  const now = new Date();
  return toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
};

export default function LedgerViewer() {
  const [rekening, setRekening] = useState<Rekening[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(lastDayOfMonth());
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [editForm, setEditForm] = useState({
    tanggal_transaksi: '',
    tipe: 'debit',
    jumlah: '',
    keterangan: '',
  });

  const fetchRekening = async () => {
    try {
      const params = new URLSearchParams({
        periode_awal: startDate,
        periode_akhir: endDate,
        system: 'old',
      });
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
        setSelectedAccount((current) =>
          legacyAccounts.some((item: Rekening) => item.kode_rekening === current)
            ? current
            : legacyAccounts[0].kode_rekening,
        );
      } else {
        setSelectedAccount('');
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching legacy rekening:', error);
    }
  };

  const fetchLedger = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        akun: selectedAccount,
        periode_awal: startDate,
        periode_akhir: endDate,
        system: 'old',
      });

      const res = await fetch(`/api/buku-besar?${params}`);
      const data = await res.json();
      const payload = data.data || {};

      setEntries((payload.old || []) as LedgerEntry[]);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      alert('Error loading ledger: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRekening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  useEffect(() => {
    if (selectedAccount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchLedger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, startDate, endDate]);

  const selectedAccountName =
    rekening.find((r) => r.kode_rekening === selectedAccount)?.nama_rekening || '-';

  const totalDebit = entries.reduce((sum, e) => sum + toNumber(e.debit), 0);
  const totalKredit = entries.reduce((sum, e) => sum + toNumber(e.kredit), 0);
  const finalBalance = totalDebit - totalKredit;

  const openEdit = (entry: LedgerEntry) => {
    const debit = toNumber(entry.debit);
    const kredit = toNumber(entry.kredit);
    setEditingEntry(entry);
    setEditForm({
      tanggal_transaksi: String(entry.tanggal_transaksi || entry.tanggal_jurnal || '').slice(0, 10),
      tipe: debit > 0 ? 'debit' : 'kredit',
      jumlah: String(debit > 0 ? debit : kredit),
      keterangan: entry.keterangan || '',
    });
  };

  const closeEdit = () => {
    setEditingEntry(null);
    setEditForm({
      tanggal_transaksi: '',
      tipe: 'debit',
      jumlah: '',
      keterangan: '',
    });
  };

  const handleEditSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingEntry) return;

    const response = await fetch('/api/buku-besar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingEntry.id,
        akun: selectedAccount,
        ...editForm,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      alert(result.error || 'Gagal memperbarui transaksi');
      return;
    }
    closeEdit();
    await fetchLedger();
    await fetchRekening();
  };

  const handleDelete = async (entry: LedgerEntry) => {
    if (!window.confirm(`Hapus transaksi ${entry.keterangan || entry.id}?`)) return;

    const response = await fetch('/api/buku-besar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      alert(result.error || 'Gagal menghapus transaksi');
      return;
    }
    await fetchLedger();
    await fetchRekening();
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Buku Besar (Ledger)</h1>

      {/* Filter */}
      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(220px,1.2fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_minmax(120px,0.6fr)]">
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
          <label className="mb-1 block text-sm font-semibold text-slate-700">Dari tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (e.target.value > endDate) setEndDate(e.target.value);
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Sampai tanggal</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          />
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
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Memuat data...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(entry)}
                        className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(entry)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    </div>
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
              <td className="px-4 py-3" />
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

      {editingEntry ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Edit Transaksi Buku Besar</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Tanggal
                <input
                  type="date"
                  value={editForm.tanggal_transaksi}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      tanggal_transaksi: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Posisi
                <select
                  value={editForm.tipe}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, tipe: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                >
                  <option value="debit">Debit</option>
                  <option value="kredit">Kredit</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Jumlah
                <input
                  type="number"
                  min={0}
                  value={editForm.jumlah}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, jumlah: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                  required
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Keterangan
                <textarea
                  value={editForm.keterangan}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      keterangan: event.target.value,
                    }))
                  }
                  className="mt-1 h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                />
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
