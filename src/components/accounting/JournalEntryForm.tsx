'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';

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
}

export default function JournalEntryForm() {
  const [rekening, setRekening] = useState<Rekening[]>([]);
  const [tanggalJurnal, setTanggalJurnal] = useState(new Date().toISOString().split('T')[0]);
  const [periode, setPeriode] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [deskripsi, setDeskripsi] = useState('');
  const [tipeJurnal, setTipeJurnal] = useState('manual');
  const [lines, setLines] = useState<JournalLine[]>([
    { kodeRekening: '', posisi: 'debit', jumlah: 0, keterangan: '' },
    { kodeRekening: '', posisi: 'kredit', jumlah: 0, keterangan: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    fetchRekening();
  }, []);

  const fetchRekening = async () => {
    try {
      const res = await fetch('/api/rekening?status=aktif');
      const data = await res.json();
      setRekening(data.data || []);
    } catch (error) {
      console.error('Error fetching rekening:', error);
    }
  };

  const totalDebit = lines.reduce((sum, line) => (line.posisi === 'debit' ? sum + line.jumlah : sum), 0);
  const totalKredit = lines.reduce((sum, line) => (line.posisi === 'kredit' ? sum + line.jumlah : sum), 0);
  const isBalanced = Math.abs(totalDebit - totalKredit) < 0.01;

  const handleAddLine = () => {
    setLines([...lines, { kodeRekening: '', posisi: 'debit', jumlah: 0, keterangan: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBalanced) {
      setMessageType('error');
      setMessage('❌ Jurnal tidak seimbang! Debit harus sama dengan Kredit');
      return;
    }

    if (lines.some((line) => !line.kodeRekening || line.jumlah <= 0)) {
      setMessageType('error');
      setMessage('❌ Semua baris harus memiliki kode rekening dan jumlah > 0');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggalJurnal,
          periode,
          deskripsi,
          tipeJurnal,
          idPengguna: 1, // TODO: get from session
          lines,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessageType('success');
        setMessage(`✅ Jurnal berhasil diposting! ID: ${data.jurnalId}`);

        // Reset form
        setTanggalJurnal(new Date().toISOString().split('T')[0]);
        setDeskripsi('');
        setTipeJurnal('manual');
        setLines([
          { kodeRekening: '', posisi: 'debit', jumlah: 0, keterangan: '' },
          { kodeRekening: '', posisi: 'kredit', jumlah: 0, keterangan: '' },
        ]);
      } else {
        setMessageType('error');
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessageType('error');
      setMessage(`❌ Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Input Jurnal Umum</h1>

      {message && (
        <div
          className={`p-4 mb-6 rounded ${
            messageType === 'success'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Tanggal Jurnal</label>
            <input
              type="date"
              value={tanggalJurnal}
              onChange={(e) => setTanggalJurnal(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Periode (YYYY-MM)</label>
            <input
              type="text"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              placeholder="2025-05"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Tipe Jurnal</label>
            <select
              value={tipeJurnal}
              onChange={(e) => setTipeJurnal(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            >
              <option value="manual">Manual</option>
              <option value="simpanan">Simpanan</option>
              <option value="pinjaman">Pinjaman</option>
              <option value="bunga">Bunga</option>
              <option value="biaya">Biaya</option>
              <option value="koreksi">Koreksi</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Deskripsi</label>
            <input
              type="text"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Deskripsi jurnal..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            />
          </div>
        </div>

        {/* Detail Lines */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Detail Jurnal</h2>
            <button
              type="button"
              onClick={handleAddLine}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus size={18} />
              Tambah Baris
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-sm text-slate-500">
                  <th className="px-4 py-3 text-left">Kode Rekening</th>
                  <th className="px-4 py-3 text-left">Nama Rekening</th>
                  <th className="px-4 py-3 text-center">Posisi</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3 text-left">Keterangan</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <select
                        value={line.kodeRekening}
                        onChange={(e) => handleLineChange(idx, 'kodeRekening', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      >
                        <option value="">-- Pilih --</option>
                        {rekening.map((r) => (
                          <option key={r.kode_rekening} value={r.kode_rekening}>
                            {r.kode_rekening}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {rekening.find((r) => r.kode_rekening === line.kodeRekening)?.nama_rekening || '-'}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <select
                        value={line.posisi}
                        onChange={(e) => handleLineChange(idx, 'posisi', e.target.value as 'debit' | 'kredit')}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      >
                        <option value="debit">Debit</option>
                        <option value="kredit">Kredit</option>
                      </select>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        value={line.jumlah}
                        onChange={(e) =>
                          handleLineChange(idx, 'jumlah', parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-sm"
                        step="1000"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={line.keterangan || ''}
                        onChange={(e) => handleLineChange(idx, 'keterangan', e.target.value)}
                        placeholder="Keterangan..."
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      />
                    </td>

                    <td className="px-4 py-3 text-center">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={2} className="px-4 py-3 text-right text-slate-900">
                    TOTAL
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-blue-600">D: Rp {totalDebit.toLocaleString('id-ID')}</div>
                    <div className="text-red-600">K: Rp {totalKredit.toLocaleString('id-ID')}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className={`text-sm font-bold ${
                        isBalanced ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isBalanced ? '✅ SEIMBANG' : `❌ TIDAK SEIMBANG (Selisih: ${Math.abs(totalDebit - totalKredit).toLocaleString('id-ID')})`}
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
          >
            <Save size={20} />
            {loading ? 'Menyimpan...' : 'Posting Jurnal'}
          </button>
          <button
            type="reset"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
          >
            <X size={20} />
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
