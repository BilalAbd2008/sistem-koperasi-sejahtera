"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

interface PinjamanItem {
  id: number;
  id_anggota: number;
  nama: string;
  jumlah_pinjam: number;
  jumlah_bunga: number;
  jangka_waktu: number;
  tanggal_pinjam: string;
  status: string;
}

export default function BendaharaPinjamanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [pinjaman, setPinjaman] = useState<PinjamanItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    "semua" | "pending" | "disetujui" | "ditolak"
  >("semua");
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PinjamanItem | null>(null);
  const [formData, setFormData] = useState({
    id_anggota: "",
    jumlah_pinjam: "",
    jumlah_bunga: "",
    jangka_waktu: "",
    status: "aktif",
  });

  const loadData = async () => {
    try {
      const response = await fetch("/api/pinjaman");
      const data = await response.json();
      if (data.success) setPinjaman(data.data);
    } catch (error) {
      console.error("Error fetching pinjaman:", error);
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

  const handleEdit = async (item: PinjamanItem) => {
    setEditingItem(item);
    setFormData({
      id_anggota: String(item.id_anggota),
      jumlah_pinjam: String(item.jumlah_pinjam),
      jumlah_bunga: String(item.jumlah_bunga),
      jangka_waktu: String(item.jangka_waktu),
      status: item.status,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const response = await fetch("/api/pinjaman", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          id_anggota: Number(formData.id_anggota),
          jumlah_pinjam: Number(formData.jumlah_pinjam),
          jumlah_bunga: Number(formData.jumlah_bunga),
          jangka_waktu: Number(formData.jangka_waktu),
          status: formData.status,
        }),
      });
      if (response.ok) {
        loadData();
        setShowEditModal(false);
        setEditingItem(null);
        setFormData({
          id_anggota: "",
          jumlah_pinjam: "",
          jumlah_bunga: "",
          jangka_waktu: "",
          status: "aktif",
        });
      }
    } catch (error) {
      console.error("Error updating pinjaman:", error);
    }
  };

  const handleDelete = async (item: PinjamanItem) => {
    if (!window.confirm(`Hapus pinjaman milik ${item.nama}?`)) return;

    try {
      const response = await fetch("/api/pinjaman", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (response.ok) loadData();
    } catch (error) {
      console.error("Error deleting pinjaman:", error);
    }
  };

  const updateStatus = async (
    item: PinjamanItem,
    nextStatus: "lunas" | "bermasalah",
  ) => {
    const response = await fetch("/api/pinjaman", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, status: nextStatus }),
    });

    if (response.ok) {
      loadData();
    }
  };

  const toUiStatus = (status: string) => {
    if (status === "aktif")
      return { label: "Pending", tone: "bg-amber-100 text-amber-700" };
    if (status === "lunas")
      return { label: "Disetujui", tone: "bg-emerald-100 text-emerald-700" };
    return { label: "Ditolak", tone: "bg-rose-100 text-rose-700" };
  };

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat data pinjaman...
      </div>
    );
  const rows = pinjaman.filter((item) => {
    if (activeTab === "semua") return true;
    if (activeTab === "pending") return item.status === "aktif";
    if (activeTab === "disetujui") return item.status === "lunas";
    return item.status === "bermasalah";
  });

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Pinjaman Bendahara
                </p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Data Pinjaman
                </h1>
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/bendahara/angsuran")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                + Input Pembayaran
              </button>
            </div>
            <div className="mt-4 flex gap-2 text-sm font-semibold">
              {[
                ["semua", "Semua"],
                ["pending", "Pending"],
                ["disetujui", "Disetujui"],
                ["ditolak", "Ditolak"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={`rounded-lg px-3 py-1 ${activeTab === key ? "bg-emerald-100 text-emerald-700" : "text-slate-500"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Nama</th>
                    <th className="px-6 py-4">Jumlah</th>
                    <th className="px-6 py-4">Bunga</th>
                    <th className="px-6 py-4">Tenor</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : rows.slice(0, 12)).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-slate-900">{item.nama}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        Rp {Number(item.jumlah_pinjam).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        Rp{" "}
                        {Number(item.jumlah_bunga || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {item.jangka_waktu} Bulan
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${toUiStatus(item.status).tone}`}
                        >
                          {toUiStatus(item.status).label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              window.alert(
                                `Detail pinjaman ${item.nama}\nNominal: Rp ${Number(item.jumlah_pinjam).toLocaleString("id-ID")}\nTenor: ${item.jangka_waktu} bulan`,
                              )
                            }
                            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            Detail
                          </button>
                          {item.status === "aktif" && (
                            <>
                              <button
                                onClick={() => updateStatus(item, "lunas")}
                                className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateStatus(item, "bermasalah")}
                                className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                              >
                                Reject
                              </button>
                            </>
                          )}
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

      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Edit Pinjaman</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input
                type="number"
                value={formData.id_anggota}
                onChange={(e) => setFormData({ ...formData, id_anggota: e.target.value })}
                placeholder="ID Anggota"
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <input
                type="number"
                value={formData.jumlah_pinjam}
                onChange={(e) => setFormData({ ...formData, jumlah_pinjam: e.target.value })}
                placeholder="Jumlah Pinjam"
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <input
                type="number"
                value={formData.jumlah_bunga}
                onChange={(e) => setFormData({ ...formData, jumlah_bunga: e.target.value })}
                placeholder="Jumlah Bunga"
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <input
                type="number"
                value={formData.jangka_waktu}
                onChange={(e) => setFormData({ ...formData, jangka_waktu: e.target.value })}
                placeholder="Jangka Waktu (bulan)"
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
              >
                <option value="aktif">Aktif</option>
                <option value="lunas">Lunas</option>
                <option value="bermasalah">Bermasalah</option>
              </select>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
                >
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
