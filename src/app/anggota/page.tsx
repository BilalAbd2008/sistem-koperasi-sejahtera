'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

interface Anggota {
  id: number;
  no_anggota: string;
  nama: string;
  email: string;
  no_telepon: string;
  alamat: string;
  tanggal_bergabung: string;
  status: string;
}

export default function AnggotaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [anggota, setAnggota] = useState<Anggota[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    no_telepon: '',
    alamat: '',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    fetchAnggota();
  }, []);

  const fetchAnggota = async () => {
    try {
      const response = await fetch('/api/anggota');
      const data = await response.json();
      if (data.success) {
        setAnggota(data.data);
      }
    } catch (error) {
      console.error('Error fetching anggota:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/anggota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ nama: '', email: '', no_telepon: '', alamat: '' });
        setShowForm(false);
        fetchAnggota();
      }
    } catch (error) {
      console.error('Error adding anggota:', error);
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
            <h1 className="text-3xl font-bold text-gray-900">Anggota</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              {showForm ? 'Batal' : '+ Tambah Anggota'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Tambah Anggota</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nama"
                    value={formData.nama}
                    onChange={(e) =>
                      setFormData({ ...formData, nama: e.target.value })
                    }
                    required
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="tel"
                    placeholder="No Telepon"
                    value={formData.no_telepon}
                    onChange={(e) =>
                      setFormData({ ...formData, no_telepon: e.target.value })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Alamat"
                    value={formData.alamat}
                    onChange={(e) =>
                      setFormData({ ...formData, alamat: e.target.value })
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
                      No Anggota
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      No Telepon
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Tanggal Bergabung
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {anggota.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.no_anggota}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.nama}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.no_telepon}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(item.tanggal_bergabung).toLocaleDateString(
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
