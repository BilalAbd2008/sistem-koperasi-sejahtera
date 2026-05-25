'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileSpreadsheet } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { exportToExcel } from '@/lib/export';

interface Laporan {
  id: number;
  periode_awal: string;
  periode_akhir: string;
  total_simpanan: number;
  total_pinjaman: number;
  total_bunga_pinjaman: number;
  total_biaya: number;
  total_laba_rugi: number;
}

interface UserData {
  nama_lengkap?: string;
  username?: string;
  role?: string;
}

export default function LaporanKeuanganPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    periode_awal: '',
    periode_akhir: '',
    total_simpanan: '',
    total_pinjaman: '',
    total_bunga_pinjaman: '',
    total_biaya: '',
    keterangan: '',
  });

  const fetchLaporan = async () => {
    try {
      const response = await fetch('/api/laporan-keuangan');
      const data = await response.json();
      if (data.success) {
        setLaporan(data.data);
      }
    } catch (error) {
      console.error('Error fetching laporan:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(JSON.parse(userData));
    void fetchLaporan();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/laporan-keuangan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periode_awal: formData.periode_awal,
          periode_akhir: formData.periode_akhir,
          total_simpanan: parseFloat(formData.total_simpanan),
          total_pinjaman: parseFloat(formData.total_pinjaman),
          total_bunga_pinjaman: parseFloat(formData.total_bunga_pinjaman),
          total_biaya: parseFloat(formData.total_biaya),
          keterangan: formData.keterangan,
        }),
      });

      if (response.ok) {
        setFormData({
          periode_awal: '',
          periode_akhir: '',
          total_simpanan: '',
          total_pinjaman: '',
          total_bunga_pinjaman: '',
          total_biaya: '',
          keterangan: '',
        });
        setShowForm(false);
        fetchLaporan();
      }
    } catch (error) {
      console.error('Error adding laporan:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(value || 0));

  const buildExportRows = () =>
    laporan.map((item) => ({
      'Periode Awal': new Date(item.periode_awal).toLocaleDateString('id-ID'),
      'Periode Akhir': new Date(item.periode_akhir).toLocaleDateString('id-ID'),
      'Total Simpanan': Number(item.total_simpanan || 0),
      'Total Pinjaman': Number(item.total_pinjaman || 0),
      Bunga: Number(item.total_bunga_pinjaman || 0),
      Biaya: Number(item.total_biaya || 0),
      'Laba/Rugi': Number(item.total_laba_rugi || 0),
    }));

  const handleDownloadExcel = () => {
    exportToExcel(buildExportRows(), 'Laporan Keuangan', 'laporan_keuangan.xlsx');
  };

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 12;
    let y = 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('KOPERASI SEJAHTERA', margin, y);
    y += 7;
    doc.setFontSize(11);
    doc.text('Laporan Keuangan', margin, y);
    y += 10;

    doc.setFontSize(8);
    doc.text('Periode', margin, y);
    doc.text('Simpanan', 105, y, { align: 'right' });
    doc.text('Pinjaman', 145, y, { align: 'right' });
    doc.text('Bunga', 185, y, { align: 'right' });
    doc.text('Biaya', 225, y, { align: 'right' });
    doc.text('Laba/Rugi', 275, y, { align: 'right' });
    y += 4;
    doc.line(margin, y, 285, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    laporan.forEach((item) => {
      if (y > 190) {
        doc.addPage();
        y = 16;
      }
      const period = `${new Date(item.periode_awal).toLocaleDateString('id-ID')} - ${new Date(
        item.periode_akhir,
      ).toLocaleDateString('id-ID')}`;
      doc.text(period, margin, y);
      doc.text(formatCurrency(item.total_simpanan), 105, y, { align: 'right' });
      doc.text(formatCurrency(item.total_pinjaman), 145, y, { align: 'right' });
      doc.text(formatCurrency(item.total_bunga_pinjaman), 185, y, { align: 'right' });
      doc.text(formatCurrency(item.total_biaya), 225, y, { align: 'right' });
      doc.text(formatCurrency(item.total_laba_rugi), 275, y, { align: 'right' });
      y += 7;
    });

    doc.save('laporan_keuangan.pdf');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        <div className="bg-white shadow-sm p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Laporan Keuangan</h1>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
              >
                <Download size={16} />
                PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-200"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                {showForm ? 'Batal' : '+ Buat Laporan'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Buat Laporan Keuangan</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Periode Awal
                    </label>
                    <input
                      type="date"
                      value={formData.periode_awal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          periode_awal: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Periode Akhir
                    </label>
                    <input
                      type="date"
                      value={formData.periode_akhir}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          periode_akhir: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Total Simpanan
                    </label>
                    <input
                      type="number"
                      value={formData.total_simpanan}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_simpanan: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Total Pinjaman
                    </label>
                    <input
                      type="number"
                      value={formData.total_pinjaman}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_pinjaman: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Total Bunga Pinjaman
                    </label>
                    <input
                      type="number"
                      value={formData.total_bunga_pinjaman}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_bunga_pinjaman: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Total Biaya
                    </label>
                    <input
                      type="number"
                      value={formData.total_biaya}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_biaya: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Keterangan
                  </label>
                  <textarea
                    value={formData.keterangan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        keterangan: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
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
                      Periode
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Total Simpanan
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Total Pinjaman
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Bunga
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Laba/Rugi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {laporan.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(item.periode_awal).toLocaleDateString(
                          'id-ID'
                        )}{' '}
                        -{' '}
                        {new Date(item.periode_akhir).toLocaleDateString(
                          'id-ID'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        Rp {item.total_simpanan.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        Rp {item.total_pinjaman.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        Rp{' '}
                        {item.total_bunga_pinjaman.toLocaleString('id-ID')}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-semibold ${
                          item.total_laba_rugi >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        Rp {item.total_laba_rugi.toLocaleString('id-ID')}
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
