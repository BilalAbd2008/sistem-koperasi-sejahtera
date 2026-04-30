'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

interface Simpanan {
  id: number;
  id_anggota: number;
  nama: string;
  jenis_simpanan: string;
  jumlah: number;
  tanggal_simpanan: string;
  status: string;
}

interface Anggota {
  id: number;
  nama: string;
}

export default function SimpananPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [simpanan, setSimpanan] = useState<Simpanan[]>([]);
  const [anggota, setAnggota] = useState<Anggota[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id_anggota: '',
    jenis_simpanan: 'wajib',
    jumlah: '',
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
      const [simpananRes, anggotaRes] = await Promise.all([
        fetch('/api/simpanan'),
        fetch('/api/anggota'),
      ]);

      const simpananData = await simpananRes.json();
      const anggotaData = await anggotaRes.json();

      if (simpananData.success) setSimpanan(simpananData.data);
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
      const response = await fetch('/api/simpanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_anggota: parseInt(formData.id_anggota),
          jenis_simpanan: formData.jenis_simpanan,
          jumlah: parseFloat(formData.jumlah),
        }),
      });

      if (response.ok) {
        setFormData({ id_anggota: '', jenis_simpanan: 'wajib', jumlah: '' });
        setShowForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error adding simpanan:', error);
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
            <h1 className="text-3xl font-bold text-gray-900">Simpanan</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              {showForm ? 'Batal' : '+ Tambah Simpanan'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Tambah Simpanan</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
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

                  <select
                    value={formData.jenis_simpanan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jenis_simpanan: e.target.value,
                      })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="pokok">Pokok</option>
                    <option value="wajib">Wajib</option>
                    <option value="sukarela">Sukarela</option>
                  </select>

                  <input
                    type="number"
                    placeholder="Jumlah"
                    value={formData.jumlah}
                    onChange={(e) =>
                      setFormData({ ...formData, jumlah: e.target.value })
                    }
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
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
                      Jenis
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Jumlah
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {simpanan.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.nama}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="capitalize">{item.jenis_simpanan}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        Rp {item.jumlah.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(item.tanggal_simpanan).toLocaleDateString(
                          'id-ID'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'aktif'
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
