"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import BendaharaSidebar from "@/components/BendaharaSidebar";
import { exportToExcel } from "@/lib/export";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

interface AnggotaItem {
  id: number;
  no_anggota: string;
  nama: string;
  email: string;
  no_telepon: string;
  alamat: string;
  status_pekerjaan: string | null;
  status: string;
}

export default function BendaharaAnggotaPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [anggota, setAnggota] = useState<AnggotaItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTambahModal, setShowTambahModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnggota, setEditingAnggota] = useState<AnggotaItem | null>(null);
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    no_telepon: "",
    alamat: "",
    status_pekerjaan: "",
    status: "aktif",
  });

  const loadData = async () => {
    try {
      const response = await fetch("/api/anggota");
      const data = await response.json();
      if (data.success) {
        setAnggota(data.data);
      }
    } catch (error) {
      console.error("Error fetching anggota:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return void router.push("/");
    if (user.role !== "bendahara" && user.role !== "admin") return void router.push("/dashboard");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(user);
    loadData();
  }, [router]);

  const handleEdit = async (item: AnggotaItem) => {
    setEditingAnggota(item);
    setFormData({
      nama: item.nama,
      email: item.email,
      no_telepon: item.no_telepon,
      alamat: item.alamat,
      status_pekerjaan: item.status_pekerjaan || "",
      status: item.status,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnggota) return;

    try {
      const response = await fetch("/api/anggota", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAnggota.id,
          ...formData,
        }),
      });
      if (response.ok) {
        loadData();
        setShowEditModal(false);
        setEditingAnggota(null);
        setFormData({ nama: "", email: "", no_telepon: "", alamat: "", status_pekerjaan: "", status: "aktif" });
      }
    } catch (error) {
      console.error("Error updating anggota:", error);
    }
  };

  const handleDelete = async (item: AnggotaItem) => {
    if (!window.confirm(`Hapus anggota ${item.nama}?`)) return;

    try {
      const response = await fetch("/api/anggota", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (response.ok) loadData();
    } catch (error) {
      console.error("Error deleting anggota:", error);
    }
  };

  const handleTambahAnggota = async () => {
    setFormData({ nama: "", email: "", no_telepon: "", alamat: "", status_pekerjaan: "", status: "aktif" });
    setEditingAnggota(null);
    setShowTambahModal(true);
  };

  const handleTambahSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) return;

    try {
      const response = await fetch("/api/anggota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        loadData();
        setShowTambahModal(false);
        setFormData({ nama: "", email: "", no_telepon: "", alamat: "", status_pekerjaan: "", status: "aktif" });
      }
    } catch (error) {
      console.error("Error creating anggota:", error);
    }
  };

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat data nasabah...
      </div>
    );

  const filtered = anggota.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.nama.toLowerCase().includes(q) ||
      item.no_anggota.toLowerCase().includes(q) ||
      item.no_telepon.toLowerCase().includes(q) ||
      (item.status_pekerjaan || "").toLowerCase().includes(q)
    );
  });
  const buildExportRows = () =>
    filtered.map((item, index) => ({
      No: index + 1,
      "No Anggota": item.no_anggota,
      Nama: item.nama,
      Email: item.email || "-",
      "No HP": item.no_telepon || "-",
      Alamat: item.alamat || "-",
      Status: item.status_pekerjaan || "-",
      Aktif: item.status,
    }));

  const handleExportExcel = () => {
    exportToExcel(buildExportRows(), "Data Nasabah", `data_nasabah_${search || "semua"}.xlsx`);
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const rows = buildExportRows();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;

    doc.setFillColor(5, 150, 105);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Laporan Data Nasabah", margin, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Filter: ${search || "Semua"} | Total: ${rows.length}`, margin, 17);

    const headers = ["No", "No Anggota", "Nama", "Email", "No HP", "Status"];
    const widths = [12, 30, 50, 58, 38, 38];
    let x = margin + 2;
    let y = 38;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 7, pageWidth - margin * 2, 10, "F");
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    headers.forEach((header, index) => {
      doc.text(header, x, y);
      x += widths[index];
    });

    y += 9;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    rows.forEach((row) => {
      if (y > 190) {
        doc.addPage();
        y = 18;
      }
      x = margin + 2;
      [
        String(row.No),
        row["No Anggota"],
        row.Nama,
        row.Email,
        row["No HP"],
        row.Status,
      ].forEach((value, index) => {
        doc.text(String(value).slice(0, 32), x, y);
        x += widths[index];
      });
      y += 8;
    });

    doc.save(`data_nasabah_${search || "semua"}.pdf`);
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Master Data Nasabah
                </p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Data Nasabah Simpan Pinjam
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={handleTambahAnggota}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  + Tambah Nasabah
                </button>
              </div>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2"
              placeholder="Cari nasabah..."
            />
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">No.</th>
                    <th className="px-6 py-4">No. Anggota</th>
                    <th className="px-6 py-4">Nama</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">No. HP</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : filtered).map((item, index) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-slate-700">{index + 1}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                        {item.no_anggota}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{item.nama}</td>
                      <td className="px-6 py-4 text-slate-700">{item.email}</td>
                      <td className="px-6 py-4 text-slate-700">
                        {item.no_telepon}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {item.status_pekerjaan || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Tambah Anggota */}
      {showTambahModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Tambah Nasabah Baru</h2>
            <form onSubmit={handleTambahSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">No. Anggota</label>
                <input
                  type="text"
                  value="Dibuat otomatis"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-slate-500"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Masukkan nama"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Masukkan email"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">No. HP</label>
                <input
                  type="text"
                  value={formData.no_telepon}
                  onChange={(e) => setFormData({ ...formData, no_telepon: e.target.value })}
                  placeholder="Masukkan nomor HP"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Alamat</label>
                <input
                  type="text"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Masukkan alamat"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <input
                  type="text"
                  value={formData.status_pekerjaan}
                  onChange={(e) => setFormData({ ...formData, status_pekerjaan: e.target.value })}
                  placeholder="Contoh: Karyawan, Wiraswasta, Pensiunan"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTambahModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Anggota */}
      {showEditModal && editingAnggota && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Nasabah</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">No. HP</label>
                <input
                  type="text"
                  value={formData.no_telepon}
                  onChange={(e) => setFormData({ ...formData, no_telepon: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Alamat</label>
                <input
                  type="text"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <input
                  type="text"
                  value={formData.status_pekerjaan}
                  onChange={(e) => setFormData({ ...formData, status_pekerjaan: e.target.value })}
                  placeholder="Contoh: Karyawan, Wiraswasta, Pensiunan"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
