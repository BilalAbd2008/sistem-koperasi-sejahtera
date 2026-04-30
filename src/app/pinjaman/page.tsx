'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

interface Pinjaman {
  id: number;
  id_anggota: number;
  nama: string;
  jumlah_pinjam: number;
  jumlah_bunga: number;
  jangka_waktu: number;
  tanggal_pinjam: string;
  tanggal_jatuh_tempo: string;
  status: string;
}

interface Anggota {
  id: number;
  nama: string;
}

export default function PinjamanPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pinjaman, setPinjaman] = useState<Pinjaman[]>([]);
  const [anggota, setAnggota] = useState<Anggota[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id_anggota: '',
    jumlah_pinjam: '',
    jumlah_bunga: '',
    jangka_waktu: '12',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pinjamanRes, anggotaRes] = await Promise.all([
        fetch('/api/pinjaman'),
        fetch('/api/anggota'),
      ]);

      const pinjamanData = await pinjamanRes.json();
      const anggotaData = await anggotaRes.json();

      if (pinjamanData.success) setPinjaman(pinjamanData.data);
      if (anggotaData.success) setAnggota(anggotaData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/pinjaman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_anggota: parseInt(formData.id_anggota),
          jumlah_pinjam: parseFloat(formData.jumlah_pinjam),
          jumlah_bunga: parseFloat(formData.jumlah_bunga),
          jangka_waktu: parseInt(formData.jangka_waktu),
        }),
      });

      if (response.ok) {
        setFormData({
          id_anggota: '',
          jumlah_pinjam: '',
          jumlah_bunga: '',
          jangka_waktu: '12',
        });
        setShowForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error adding pinjaman:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 overflow-auto">
        <div className="bg-white shadow-sm p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Pinjaman</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              {showForm ? 'Batal' : '+ Tambah Pinjaman'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Tambah Pinjaman</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={formData.id_anggota}
                    onChange={(e) =>
                      setFormData({ ...formData, id_anggota: e.target.value })
                    }
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Pilih Anggota</option>
                    {anggota.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nama}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Jumlah Pinjam"
                    value={formData.jumlah_pinjam}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jumlah_pinjam: e.target.value,
                      })
                    }
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Jumlah Bunga"
                    value={formData.jumlah_bunga}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jumlah_bunga: e.target.value,
                      })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />

                  <select
                    value={formData.jangka_waktu}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jangka_waktu: e.target.value,
                      })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="6">6 Bulan</option>
                    <option value="12">12 Bulan</option>
                    <option value="24">24 Bulan</option>
                    <option value="36">36 Bulan</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Simpan
                </button>
              </form>
            </div>
          )}

          {loading ? (
            <div className="text-center">Memuat data...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Nama Anggota
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Jumlah Pinjam
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Bunga
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Jangka Waktu
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Jatuh Tempo
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pinjaman.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.nama}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        Rp {item.jumlah_pinjam.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        Rp {item.jumlah_bunga.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.jangka_waktu} Bulan
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(item.tanggal_jatuh_tempo).toLocaleDateString(
                          'id-ID'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'aktif'
                              ? 'bg-yellow-100 text-yellow-800'
                              : item.status === 'lunas'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
