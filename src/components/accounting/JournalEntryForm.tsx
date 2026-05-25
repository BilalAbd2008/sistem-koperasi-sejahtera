'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';

interface JournalLine {
  kodeRekening: string;
  posisi: 'debit' | 'kredit';
  jumlah: number;
  keterangan?: string;
  idAnggota?: number | null;
}

interface Rekening {
  kode_rekening: string;
  nama_rekening: string;
  kategori: string;
  jenis_akun?: 'parent' | 'child';
  parent_kode_rekening?: string | null;
}

interface JournalDetail {
  kode_rekening: string;
  nama_rekening?: string;
  posisi: 'debit' | 'kredit';
  jumlah: number | string;
  keterangan?: string | null;
}

interface JournalEntry {
  id: number;
  nomor_jurnal: string;
  tanggal_jurnal: string;
  periode: string;
  deskripsi: string;
  tipe_jurnal: string;
  total_debit: number | string;
  total_kredit: number | string;
  details?: JournalDetail[];
}

const toDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toPeriode = (dateValue: string) => dateValue.slice(0, 7);

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

export default function JournalEntryForm() {
  const [rekening, setRekening] = useState<Rekening[]>([]);
  const [tanggalJurnal, setTanggalJurnal] = useState(toDateInput(new Date()));
  const [deskripsi, setDeskripsi] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { kodeRekening: '', posisi: 'debit', jumlah: 0, keterangan: '' },
    { kodeRekening: '', posisi: 'kredit', jumlah: 0, keterangan: '' },
  ]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [journalLoading, setJournalLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const fetchRekening = useCallback(async () => {
    try {
      const res = await fetch('/api/rekening?status=aktif');
      const data = await res.json();
      setRekening(data.data || []);
    } catch (error) {
      console.error('Error fetching rekening:', error);
    }
  }, []);

  const fetchJournals = useCallback(async () => {
    setJournalLoading(true);
    try {
      const params = new URLSearchParams({
        system: 'new',
        statusPosting: 'posted',
        limit: '100',
      });
      const res = await fetch(`/api/jurnal?${params}`);
      const data = await res.json();
      setJournalEntries((data.data || []) as JournalEntry[]);
    } catch (error) {
      console.error('Error fetching jurnal:', error);
    } finally {
      setJournalLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRekening();
  }, [fetchRekening]);

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
  }, [fetchRekening]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchJournals();
  }, [fetchJournals]);

  const totalDebit = lines.reduce(
    (sum, line) => sum + (line.posisi === 'debit' ? Number(line.jumlah || 0) : 0),
    0,
  );
  const totalKredit = lines.reduce(
    (sum, line) => sum + (line.posisi === 'kredit' ? Number(line.jumlah || 0) : 0),
    0,
  );
  const isBalanced = Math.abs(totalDebit - totalKredit) < 0.01;

  const resetForm = () => {
    const today = toDateInput(new Date());
    setTanggalJurnal(today);
    setDeskripsi('');
    setLines([
      { kodeRekening: '', posisi: 'debit', jumlah: 0, keterangan: '' },
      { kodeRekening: '', posisi: 'kredit', jumlah: 0, keterangan: '' },
    ]);
  };

  const handleLineChange = (
    index: number,
    field: 'kodeRekening' | 'posisi' | 'jumlah' | 'keterangan',
    value: string | number | JournalLine['posisi'],
  ) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  };

  const addLine = (posisi: JournalLine['posisi']) => {
    setLines((current) => [
      ...current,
      { kodeRekening: '', posisi, jumlah: 0, keterangan: '' },
    ]);
  };

  const removeLine = (index: number) => {
    setLines((current) => (current.length <= 2 ? current : current.filter((_, i) => i !== index)));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isBalanced) {
      setMessageType('error');
      setMessage('Jurnal tidak seimbang. Debit harus sama dengan kredit.');
      return;
    }

    if (lines.some((line) => !line.kodeRekening || line.jumlah <= 0)) {
      setMessageType('error');
      setMessage('Akun dan jumlah debit/kredit wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggalJurnal,
          periode: toPeriode(tanggalJurnal),
          deskripsi,
          tipeJurnal: 'manual',
          idPengguna: 1,
          lines,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessageType('error');
        setMessage(data.error || 'Gagal menyimpan jurnal');
        return;
      }

      setMessageType('success');
      setMessage(`Jurnal berhasil diposting. Nomor ID: ${data.jurnalId}`);
      resetForm();
      await fetchJournals();
      window.localStorage.setItem('accounting-ledger-refresh', String(Date.now()));
    } catch (error) {
      setMessageType('error');
      setMessage(`Gagal menyimpan jurnal: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = journalEntries.filter((entry) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    const detailText = (entry.details || [])
      .map((detail) => `${detail.kode_rekening} ${detail.nama_rekening || ''}`)
      .join(' ');
    return `${entry.nomor_jurnal} ${entry.deskripsi} ${entry.periode} ${detailText}`
      .toLowerCase()
      .includes(query);
  });

  const accountLabel = (detail: JournalDetail) =>
    `${detail.kode_rekening} ${detail.nama_rekening || ''}`.trim();

  const isChildAccount = (item: Rekening) =>
    item.jenis_akun === 'child' || (!!item.parent_kode_rekening && item.jenis_akun !== 'parent');

  const accountOptionLabel = (item: Rekening) =>
    `${isChildAccount(item) ? '\u00A0\u00A0\u00A0\u00A0' : ''}${item.kode_rekening} ${item.nama_rekening}`;

  const renderAccountSelect = (index: number, line: JournalLine) => (
    <select
      value={line.kodeRekening}
      onChange={(event) => handleLineChange(index, 'kodeRekening', event.target.value)}
      onFocus={() => void fetchRekening()}
      onMouseDown={() => void fetchRekening()}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      required
    >
      <option value="">Pilih Akun</option>
      {rekening.map((item) => (
        <option key={item.kode_rekening} value={item.kode_rekening}>
          {accountOptionLabel(item)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900">
              <BookOpen size={20} />
              Form Input Jurnal Koperasi
            </h1>

            {message ? (
              <div
                className={`mb-6 rounded-lg border p-4 ${
                  messageType === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {message}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Tanggal
                  <input
                    type="date"
                    value={tanggalJurnal}
                    onChange={(event) => setTanggalJurnal(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Deskripsi
                  <input
                    type="text"
                    value={deskripsi}
                    onChange={(event) => setDeskripsi(event.target.value)}
                    placeholder="Contoh: Setoran simpanan wajib anggota"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                    required
                  />
                </label>
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h2 className="text-sm font-bold text-slate-900">Detail Jurnal</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addLine('debit')}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 hover:bg-sky-100"
                    >
                      <Plus size={16} />
                      Debit
                    </button>
                    <button
                      type="button"
                      onClick={() => addLine('kredit')}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                    >
                      <Plus size={16} />
                      Kredit
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-sm">
                    <thead>
                      <tr className="bg-white text-slate-500">
                        <th className="px-4 py-3 text-left">Posisi</th>
                        <th className="px-4 py-3 text-left">Akun</th>
                        <th className="px-4 py-3 text-right">Jumlah</th>
                        <th className="px-4 py-3 text-left">Keterangan</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <select
                              value={line.posisi}
                              onChange={(event) =>
                                handleLineChange(
                                  index,
                                  'posisi',
                                  event.target.value as JournalLine['posisi'],
                                )
                              }
                              className={`w-full rounded-lg border px-3 py-2 font-semibold capitalize ${
                                line.posisi === 'debit'
                                  ? 'border-sky-100 bg-sky-50 text-sky-700'
                                  : 'border-red-100 bg-red-50 text-red-700'
                              }`}
                            >
                              <option value="debit">Debit</option>
                              <option value="kredit">Kredit</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">{renderAccountSelect(index, line)}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              value={line.jumlah}
                              onChange={(event) =>
                                handleLineChange(
                                  index,
                                  'jumlah',
                                  parseFloat(event.target.value) || 0,
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-slate-900"
                              required
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={line.keterangan || ''}
                              onChange={(event) =>
                                handleLineChange(index, 'keterangan', event.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              disabled={lines.length <= 2}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:text-slate-300 disabled:hover:bg-transparent"
                              aria-label="Hapus baris jurnal"
                            >
                              <Trash2 size={17} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold">
                  <span className="text-sky-700">Debit: {formatCurrency(totalDebit)}</span>
                  <span className="mx-3 text-slate-300">|</span>
                  <span className="text-red-700">Kredit: {formatCurrency(totalKredit)}</span>
                  <span className={`ml-3 ${isBalanced ? 'text-emerald-700' : 'text-red-700'}`}>
                    {isBalanced
                      ? 'Seimbang'
                      : `Selisih ${formatCurrency(Math.abs(totalDebit - totalKredit))}`}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-400"
                  >
                    <Save size={18} />
                    {loading ? 'Menyimpan...' : 'Simpan Jurnal'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex items-center gap-2 rounded-lg bg-slate-200 px-5 py-2 font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    <X size={18} />
                    Batal
                  </button>
                </div>
              </div>
            </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search jurnal..."
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => void fetchJournals()}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-3 py-3">Tanggal</th>
                    <th className="px-3 py-3">Deskripsi</th>
                    <th className="px-3 py-3">Akun Debit</th>
                    <th className="px-3 py-3 text-right">Debit</th>
                    <th className="px-3 py-3">Akun Kredit</th>
                    <th className="px-3 py-3 text-right">Kredit</th>
                    <th className="px-3 py-3">Tipe</th>
                  </tr>
                </thead>
                <tbody>
                  {journalLoading ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        Memuat jurnal...
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        Tidak ada jurnal
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => {
                      const debits = (entry.details || []).filter(
                        (detail) => detail.posisi === 'debit',
                      );
                      const credits = (entry.details || []).filter(
                        (detail) => detail.posisi === 'kredit',
                      );

                      return (
                        <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-3 text-slate-700">
                            {new Date(entry.tanggal_jurnal).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            <div className="font-medium text-slate-900">{entry.deskripsi}</div>
                            <div className="font-mono text-xs text-slate-500">
                              {entry.nomor_jurnal}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {debits.map(accountLabel).join(', ') || '-'}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-sky-600">
                            {formatCurrency(entry.total_debit)}
                          </td>
                          <td className="px-3 py-3 text-slate-700">
                            {credits.map(accountLabel).join(', ') || '-'}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-red-600">
                            {formatCurrency(entry.total_kredit)}
                          </td>
                          <td className="px-3 py-3 capitalize text-slate-600">
                            {entry.tipe_jurnal}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
      </div>
    </div>
  );
}
