'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface Rekening {
  id?: number;
  kode_rekening: string;
  nama_rekening: string;
  deskripsi?: string;
  kategori: 'aset' | 'liabilitas' | 'modal' | 'pendapatan' | 'beban';
  tipe_normal: 'debit' | 'kredit';
  status: 'aktif' | 'nonaktif';
}

const kategoriColors: Record<string, string> = {
  aset: 'bg-blue-100 text-blue-800',
  liabilitas: 'bg-red-100 text-red-800',
  modal: 'bg-green-100 text-green-800',
  pendapatan: 'bg-purple-100 text-purple-800',
  beban: 'bg-orange-100 text-orange-800',
};

const labelKategori = (kategori: string) =>
  kategori === 'modal' ? 'Ekuitas' : kategori;

export default function ChartOfAccountsManager() {
  const [rekening, setRekening] = useState<Rekening[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Rekening>({
    kode_rekening: '',
    nama_rekening: '',
    deskripsi: '',
    kategori: 'aset',
    tipe_normal: 'debit',
    status: 'aktif',
  });

  const fetchRekening = async () => {
    try {
      const params = new URLSearchParams();
      if (filter) params.append('kategori', filter);

      const res = await fetch(`/api/rekening?${params}`);
      const data = await res.json();
      setRekening(data.data || []);
    } catch (error) {
      console.error('Error fetching rekening:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRekening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleAdd = () => {
    setFormData({
      kode_rekening: '',
      nama_rekening: '',
      deskripsi: '',
      kategori: 'aset',
      tipe_normal: 'debit',
      status: 'aktif',
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (item: Rekening) => {
    setFormData(item);
    setEditingId(item.kode_rekening);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/rekening', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowForm(false);
        fetchRekening();
      } else {
        alert('Error saving rekening');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error: ' + String(error));
    }
  };

  const handleDelete = async (kode: string) => {
    if (!confirm('Yakin ingin menghapus?')) return;

    try {
      const res = await fetch('/api/rekening', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kodeRekening: kode }),
      });

      if (res.ok) {
        fetchRekening();
      } else {
        alert('Error deleting rekening');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error: ' + String(error));
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-900">Nama Akun</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={20} />
          Tambah Akun
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            filter === '' ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Semua
        </button>
        {Object.keys(kategoriColors).map((kat) => (
          <button
            key={kat}
            onClick={() => setFilter(kat)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize ${
              filter === kat ? kategoriColors[kat] : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {labelKategori(kat)}
          </button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Akun' : 'Tambah Akun Baru'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Kode Akun</label>
                <input
                  type="text"
                  disabled={!!editingId}
                  value={formData.kode_rekening}
                  onChange={(e) =>
                    setFormData({ ...formData, kode_rekening: e.target.value })
                  }
                  placeholder="1-1100"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Nama Akun</label>
                <input
                  type="text"
                  value={formData.nama_rekening}
                  onChange={(e) =>
                    setFormData({ ...formData, nama_rekening: e.target.value })
                  }
                  placeholder="Kas"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Deskripsi</label>
                <textarea
                  value={formData.deskripsi || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Deskripsi akun..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Kategori</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kategori: e.target.value as Rekening['kategori'],
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <option value="aset">Aset</option>
                    <option value="liabilitas">Liabilitas</option>
                    <option value="modal">Ekuitas</option>
                    <option value="pendapatan">Pendapatan</option>
                    <option value="beban">Beban</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Tipe Normal</label>
                  <select
                    value={formData.tipe_normal}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipe_normal: e.target.value as Rekening['tipe_normal'],
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <option value="debit">Debit</option>
                    <option value="kredit">Kredit</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSave}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
                >
                  <Save size={18} />
                  Simpan
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <X size={18} />
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-sm text-slate-500">
              <th className="px-4 py-3 text-left">Kode</th>
              <th className="px-4 py-3 text-left">Nama Akun</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : rekening.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Tidak ada data
                </td>
              </tr>
            ) : (
              rekening.map((item) => (
                <tr key={item.kode_rekening} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold">
                    {item.kode_rekening}
                  </td>
                  <td className="px-4 py-3">{item.nama_rekening}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 rounded capitalize text-xs font-semibold ${
                        kategoriColors[item.kategori]
                      }`}
                    >
                      {labelKategori(item.kategori)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center capitalize">
                    {item.tipe_normal}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.status === 'aktif'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.kode_rekening)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
