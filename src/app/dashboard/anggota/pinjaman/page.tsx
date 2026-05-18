"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import MemberSidebar from "@/components/MemberSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

interface PinjamanItem {
  id: number;
  id_anggota?: number;
  nama: string;
  jumlah_pinjam: number;
  jumlah_bunga: number;
  jangka_waktu: number;
  tanggal_pinjam?: string;
  tanggal_jatuh_tempo: string;
  status: string;
}

export default function AnggotaPinjamanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [pinjaman, setPinjaman] = useState<PinjamanItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    jumlah_pinjam: "",
    jangka_waktu: "12",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/");
      return;
    }

    if (user.role !== "anggota") {
      router.push("/dashboard");
      return;
    }

    setUser(user);

    const loadData = async () => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        const anggota_id = currentUser.anggota_id;

        const response = await fetch(`/api/pinjaman?id_anggota=${anggota_id}`);
        const data = await response.json();
        if (data.success) {
          setPinjaman(data.data.slice(0, 8));
        }
      } catch (error) {
        console.error("Error fetching pinjaman:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const totalPinjaman = pinjaman.reduce(
    (sum, row) => sum + Number(row.jumlah_pinjam || 0),
    0,
  );
  const totalBunga = pinjaman.reduce(
    (sum, row) => sum + Number(row.jumlah_bunga || 0),
    0,
  );
  const sisaPinjaman = Math.max(totalPinjaman - totalBunga, 0);

  const mapStatus = (raw: string) => {
    if (raw === "bermasalah") {
      return { label: "ditolak", className: "bg-red-100 text-red-700" };
    }
    if (raw === "aktif") {
      return { label: "menunggu", className: "bg-amber-100 text-amber-700" };
    }
    return { label: "disetujui", className: "bg-emerald-100 text-emerald-700" };
  };

  const handleAjukanPinjaman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jumlah_pinjam) return;

    setSubmitting(true);
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      const anggota_id = currentUser.anggota_id;

      if (!anggota_id) {
        alert("Data anggota tidak ditemukan. Silakan login ulang.");
        return;
      }

      const response = await fetch("/api/pinjaman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_anggota: anggota_id,
          jumlah_pinjam: Number(formData.jumlah_pinjam),
          jumlah_bunga: 0,
          jangka_waktu: Number(formData.jangka_waktu),
        }),
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({ jumlah_pinjam: "", jangka_waktu: "12" });
        const reload = await fetch(`/api/pinjaman?id_anggota=${anggota_id}`);
        const data = await reload.json();
        if (data.success) {
          setPinjaman(data.data.slice(0, 8));
        }
      }
    } catch (error) {
      console.error("Error submitting pinjaman:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat halaman pinjaman...
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex h-full">
        <MemberSidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Pinjaman (Anggota)
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Pinjaman Saya</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-sky-50 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Pinjaman</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                Rp {totalPinjaman.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Sisa Pinjaman</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                Rp {sisaPinjaman.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Angsuran Dibayar</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                Rp {totalBunga.toLocaleString("id-ID")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              + Ajukan Pinjaman
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleAjukanPinjaman}
              className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-base font-bold text-slate-900">
                Pengajuan Pinjaman
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">
                    Jumlah Pinjaman
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.jumlah_pinjam}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        jumlah_pinjam: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    placeholder="Contoh: 10000000"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">
                    Tenor (bulan)
                  </label>
                  <select
                    value={formData.jangka_waktu}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        jangka_waktu: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <option value="6">6 bulan</option>
                    <option value="12">12 bulan</option>
                    <option value="24">24 bulan</option>
                    <option value="36">36 bulan</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "Mengajukan..." : "Kirim Pengajuan"}
              </button>
            </form>
          )}

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Riwayat Pinjaman
              </h2>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Tanggal Pinjam</th>
                    <th className="px-6 py-4">Jumlah Pinjaman</th>
                    <th className="px-6 py-4">Tenor</th>
                    <th className="px-6 py-4">Bunga</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : pinjaman).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-slate-700">
                        {new Date(
                          item.tanggal_pinjam || item.tanggal_jatuh_tempo,
                        ).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        Rp {Number(item.jumlah_pinjam).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {item.jangka_waktu} Bulan
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {Number(item.jumlah_bunga || 0).toLocaleString("id-ID")}{" "}
                        / Tahun
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${mapStatus(item.status).className}`}
                        >
                          {mapStatus(item.status).label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
