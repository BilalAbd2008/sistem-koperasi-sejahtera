"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

interface SimpananItem {
  id: number;
  id_anggota: number;
  nama: string;
  jenis_simpanan: string;
  jumlah: number;
  tanggal_simpanan: string;
  status: string;
}

export default function BendaharaSimpananPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [simpanan, setSimpanan] = useState<SimpananItem[]>([]);
  const [jenisFilter, setJenisFilter] = useState("semua");
  const [range, setRange] = useState("31");
  const [loading, setLoading] = useState(true);
  const [showTambahModal, setShowTambahModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SimpananItem | null>(null);
  const [formData, setFormData] = useState({
    id_anggota: "",
    jenis_simpanan: "wajib",
    jumlah: "",
    status: "aktif",
  });

  const loadData = async () => {
    try {
      const response = await fetch("/api/simpanan");
      const data = await response.json();
      if (data.success) setSimpanan(data.data);
    } catch (error) {
      console.error("Error fetching simpanan:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) return void router.push("/");
    const parsedUser = JSON.parse(userData) as UserData;
    if (parsedUser.role !== "bendahara") return void router.push("/dashboard");
    setUser(parsedUser);
    loadData();
  }, [router]);

  const handleEdit = async (item: SimpananItem) => {
    setEditingItem(item);
    setFormData({
      id_anggota: String(item.id_anggota),
      jenis_simpanan: item.jenis_simpanan,
      jumlah: String(item.jumlah),
      status: item.status,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const response = await fetch("/api/simpanan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          id_anggota: Number(formData.id_anggota),
          jenis_simpanan: formData.jenis_simpanan,
          jumlah: Number(formData.jumlah),
          status: formData.status,
        }),
      });
      if (response.ok) {
        loadData();
        setShowEditModal(false);
        setEditingItem(null);
        setFormData({ id_anggota: "", jenis_simpanan: "wajib", jumlah: "", status: "aktif" });
      }
    } catch (error) {
      console.error("Error updating simpanan:", error);
    }
  };

  const handleDelete = async (item: SimpananItem) => {
    if (!window.confirm(`Hapus simpanan milik ${item.nama}?`)) return;

    try {
      const response = await fetch("/api/simpanan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (response.ok) loadData();
    } catch (error) {
      console.error("Error deleting simpanan:", error);
    }
  };

  const handleTambahSimpanan = async () => {
    setFormData({ id_anggota: "", jenis_simpanan: "wajib", jumlah: "", status: "aktif" });
    setEditingItem(null);
    setShowTambahModal(true);
  };

  const handleTambahSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_anggota || !formData.jenis_simpanan || !formData.jumlah) {
      return;
    }

    try {
      const response = await fetch("/api/simpanan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_anggota: Number(formData.id_anggota),
          jenis_simpanan: formData.jenis_simpanan,
          jumlah: Number(formData.jumlah),
        }),
      });

      if (response.ok) {
        loadData();
        setShowTambahModal(false);
        setFormData({ id_anggota: "", jenis_simpanan: "wajib", jumlah: "", status: "aktif" });
      }
    } catch (error) {
      console.error("Error creating simpanan:", error);
    }
  };

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat data simpanan...
      </div>
    );
  const now = Date.now();
  const maxDays = Number(range || 31);
  const filtered = simpanan.filter((item) => {
    const byJenis =
      jenisFilter === "semua" || item.jenis_simpanan === jenisFilter;
    const diffDays = Math.floor(
      (now - new Date(item.tanggal_simpanan).getTime()) / (1000 * 60 * 60 * 24),
    );
    return byJenis && diffDays <= maxDays;
  });
  const totalNominal = filtered.reduce(
    (sum, item) => sum + Number(item.jumlah || 0),
    0,
  );

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Simpanan Bendahara
                </p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Data Simpanan
                </h1>
              </div>
              <button
                type="button"
                onClick={handleTambahSimpanan}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                + Tambah Simpanan
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select
                value={jenisFilter}
                onChange={(e) => setJenisFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="semua">Semua Jenis</option>
                <option value="pokok">Simpanan Pokok</option>
                <option value="wajib">Simpanan Wajib</option>
                <option value="sukarela">Simpanan Sukarela</option>
              </select>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="31">31 hari terakhir</option>
                <option value="90">3 bulan terakhir</option>
                <option value="365">1 tahun terakhir</option>
              </select>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2"
                placeholder="Cari nama anggota..."
                disabled
              />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Nama</th>
                    <th className="px-6 py-4">Jenis</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : filtered.slice(0, 12)).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-slate-900">{item.nama}</td>
                      <td className="px-6 py-4 text-slate-700 capitalize">
                        {item.jenis_simpanan}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        Rp {Number(item.jumlah).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {new Date(item.tanggal_simpanan).toLocaleDateString(
                          "id-ID",
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {item.status}
                        </span>
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
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold">
                    <td className="px-6 py-4" colSpan={2}>
                      Total
                    </td>
                    <td className="px-6 py-4">
                      Rp {totalNominal.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4" colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </main>
      </div>

      {showTambahModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Tambah Simpanan</h2>
            <form onSubmit={handleTambahSubmit} className="space-y-4">
              <input
                type="number"
                value={formData.id_anggota}
                onChange={(e) => setFormData({ ...formData, id_anggota: e.target.value })}
                placeholder="ID Anggota"
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <select
                value={formData.jenis_simpanan}
                onChange={(e) => setFormData({ ...formData, jenis_simpanan: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
              >
                <option value="pokok">Pokok</option>
                <option value="wajib">Wajib</option>
                <option value="sukarela">Sukarela</option>
              </select>
              <input
                type="number"
                value={formData.jumlah}
                onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                placeholder="Jumlah"
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowTambahModal(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2">
                  Batal
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Edit Simpanan</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input
                type="number"
                value={formData.id_anggota}
                onChange={(e) => setFormData({ ...formData, id_anggota: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <select
                value={formData.jenis_simpanan}
                onChange={(e) => setFormData({ ...formData, jenis_simpanan: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
              >
                <option value="pokok">Pokok</option>
                <option value="wajib">Wajib</option>
                <option value="sukarela">Sukarela</option>
              </select>
              <input
                type="number"
                value={formData.jumlah}
                onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
              >
                <option value="aktif">Aktif</option>
                <option value="ditarik">Ditarik</option>
              </select>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2">
                  Batal
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
