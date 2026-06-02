'use client';

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '@/lib/export';

interface LedgerEntry {
  id: number;
  systemType?: 'legacy' | 'modern';
  tanggal_jurnal?: string;
  tanggal_transaksi?: string;
  nomor_jurnal?: string;
  akun?: string;
  kode_rekening?: string;
  posisi?: string;
  jumlah: number | string;
  keterangan: string;
  nama_anggota?: string;
  nama_rekening?: string;
  tipe_normal?: 'debit' | 'kredit';
  debit: number | string | null;
  kredit: number | string | null;
  saldo: number | string | null;
}

interface Rekening {
  kode_rekening: string;
  nama_rekening: string;
  kategori: string;
  tipe_normal?: 'debit' | 'kredit';
  jenis_akun?: 'parent' | 'child';
  parent_kode_rekening?: string | null;
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

const toDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const toMonthInput = (dateValue: string) => dateValue.slice(0, 7);

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
      const res = await fetch('/api/rekening?status=aktif');
      const data = await res.json();
      const accounts = (data.data || []) as Rekening[];
      setRekening(accounts);
      setSelectedAccount((current) =>
        accounts.some((item) => item.kode_rekening === current) ? current : '',
      );
      if (accounts.length === 0) {
        setSelectedAccount('');
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching legacy rekening:', error);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periode_awal: startDate,
        periode_akhir: endDate,
        system: 'new',
      });
      if (selectedAccount) {
        params.set('akun', selectedAccount);
      }

      const res = await fetch(`/api/buku-besar?${params}`);
      const data = await res.json();
      const payload = data.data || {};

      setEntries(
        ((payload.new || []) as LedgerEntry[]).map((entry) => ({
          ...entry,
          systemType: 'modern',
        })),
      );
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
  }, []);

  useEffect(() => {
    const refreshAccounts = () => void fetchRekening();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'accounting-accounts-refresh') {
        refreshAccounts();
      }
    };

    window.addEventListener('focus', refreshAccounts);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('focus', refreshAccounts);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, startDate, endDate]);

  useEffect(() => {
    const refreshLedger = () => {
      void fetchLedger();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'accounting-ledger-refresh') {
        refreshLedger();
      }
    };

    window.addEventListener('focus', refreshLedger);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('focus', refreshLedger);
      window.removeEventListener('storage', handleStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, startDate, endDate]);

  const selectedAccountName =
    rekening.find((r) => r.kode_rekening === selectedAccount)?.nama_rekening || 'Semua akun';
  const isChildAccount = (item: Rekening) =>
    item.jenis_akun === 'child' || (!!item.parent_kode_rekening && item.jenis_akun !== 'parent');
  const accountOptionLabel = (item: Rekening) =>
    `${isChildAccount(item) ? '\u00A0\u00A0\u00A0\u00A0' : ''}${item.kode_rekening} ${item.nama_rekening}`;

  const totalDebit = entries.reduce((sum, e) => sum + toNumber(e.debit), 0);
  const totalKredit = entries.reduce((sum, e) => sum + toNumber(e.kredit), 0);
  const selectedAccountMeta = rekening.find((r) => r.kode_rekening === selectedAccount);
  const finalBalance =
    selectedAccount && selectedAccountMeta?.tipe_normal === 'kredit'
      ? totalKredit - totalDebit
      : totalDebit - totalKredit;

  const buildExportRows = () => [
    ...entries.map((entry) => ({
      Tanggal: new Date(entry.tanggal_jurnal || entry.tanggal_transaksi || '').toLocaleDateString(
        'id-ID',
      ),
      'Nomor Referensi': entry.nomor_jurnal || entry.id,
      'Kode Akun': entry.kode_rekening || entry.akun || '',
      'Nama Akun': entry.nama_rekening || '',
      Keterangan: entry.keterangan || '',
      Anggota: entry.nama_anggota || '',
      Debit: toNumber(entry.debit),
      Kredit: toNumber(entry.kredit),
      Saldo: toNumber(entry.saldo),
    })),
    {
      Tanggal: '',
      'Nomor Referensi': '',
      'Kode Akun': 'TOTAL',
      'Nama Akun': selectedAccountName,
      Keterangan: '',
      Anggota: '',
      Debit: totalDebit,
      Kredit: totalKredit,
      Saldo: finalBalance,
    },
  ];

  const exportFileName = `buku_besar_${selectedAccount || 'semua'}_${startDate}_${endDate}`;

  const handleDownloadExcel = () => {
    exportToExcel(buildExportRows(), 'Buku Besar', `${exportFileName}.xlsx`);
  };

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 10;
    let y = 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('KOPERASI PRI BDAPK CINAGARA', margin, y);
    y += 7;
    doc.setFontSize(11);
    doc.text(`Buku Besar - ${selectedAccountName}`, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Periode ${startDate} sampai ${endDate}`, margin, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal', margin, y);
    doc.text('Referensi', margin + 24, y);
    doc.text('Akun', margin + 55, y);
    doc.text('Keterangan', margin + 105, y);
    doc.text('Debit', 205, y, { align: 'right' });
    doc.text('Kredit', 242, y, { align: 'right' });
    doc.text('Saldo', 282, y, { align: 'right' });
    y += 4;
    doc.line(margin, y, 287, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    entries.forEach((entry) => {
      if (y > 190) {
        doc.addPage();
        y = 16;
      }
      doc.text(
        new Date(entry.tanggal_jurnal || entry.tanggal_transaksi || '').toLocaleDateString('id-ID'),
        margin,
        y,
      );
      doc.text(String(entry.nomor_jurnal || entry.id).slice(0, 16), margin + 24, y);
      doc.text(`${entry.kode_rekening || ''} ${entry.nama_rekening || ''}`.slice(0, 34), margin + 55, y);
      doc.text(String(entry.keterangan || '').slice(0, 48), margin + 105, y);
      doc.text(toNumber(entry.debit) > 0 ? formatCurrency(entry.debit) : '-', 205, y, {
        align: 'right',
      });
      doc.text(toNumber(entry.kredit) > 0 ? formatCurrency(entry.kredit) : '-', 242, y, {
        align: 'right',
      });
      doc.text(formatCurrency(entry.saldo), 282, y, { align: 'right' });
      y += 7;
    });

    y += 2;
    doc.line(margin, y, 287, y);
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', margin, y);
    doc.text(formatCurrency(totalDebit), 205, y, { align: 'right' });
    doc.text(formatCurrency(totalKredit), 242, y, { align: 'right' });
    doc.text(formatCurrency(finalBalance), 282, y, { align: 'right' });
    doc.save(`${exportFileName}.pdf`);
  };

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
        system: editingEntry.systemType === 'modern' ? 'new' : 'old',
        akun: selectedAccount || editingEntry.akun || editingEntry.kode_rekening,
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
    const deleteLabel =
      entry.systemType === 'modern'
        ? `jurnal ${entry.nomor_jurnal || entry.id} beserta semua detailnya`
        : `transaksi ${entry.keterangan || entry.id}`;
    if (!window.confirm(`Hapus ${deleteLabel}?`)) return;

    const response = await fetch('/api/buku-besar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: entry.id,
        system: entry.systemType === 'modern' ? 'new' : 'old',
      }),
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Buku Besar (Ledger)</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <Download size={16} />
            PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-200"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(220px,1.2fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_minmax(120px,0.6fr)]">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Akun</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            onFocus={() => void fetchRekening()}
            onMouseDown={() => void fetchRekening()}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          >
            <option value="">Semua akun</option>
            {rekening.map((r) => (
              <option key={r.kode_rekening} value={r.kode_rekening}>
                {accountOptionLabel(r)}
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
          Periode: <span className="font-mono">{toMonthInput(startDate)}</span>
          {selectedAccount ? (
            <>
              {' '}
              | Kode akun: <span className="font-mono">{selectedAccount}</span>
            </>
          ) : null}
        </p>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              <th className="px-4 py-3 text-left">Tanggal</th>
              <th className="px-4 py-3 text-left">Nomor Referensi</th>
              <th className="px-4 py-3 text-left">Akun</th>
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
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  Memuat data...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
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
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-slate-500">{entry.kode_rekening}</div>
                    <div className="font-medium text-slate-700">{entry.nama_rekening || '-'}</div>
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
              <td colSpan={5} className="px-4 py-3 text-right">
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
            {selectedAccountMeta?.tipe_normal || selectedAccountMeta?.kategori || 'gabungan'}
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
