"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}
interface AngsuranItem {
  id: number;
  id_pinjaman: number;
  id_anggota: number;
  jumlah_bayar: number;
  tanggal_bayar: string;
  keterangan: string | null;
}

interface AnggotaItem {
  id: number;
  nama: string;
}

export default function BendaharaAngsuranPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [angsuran, setAngsuran] = useState<AngsuranItem[]>([]);
  const [anggotaMap, setAnggotaMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [showInputModal, setShowInputModal] = useState(false);
  const [formData, setFormData] = useState({
    id_pinjaman: "",
    jumlah_bayar: "",
    keterangan: "Input manual bendahara",
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) return void router.push("/");
    const parsedUser = JSON.parse(userData) as UserData;
    if (parsedUser.role !== "bendahara") return void router.push("/dashboard");
    setUser(parsedUser);
    Promise.all([fetch("/api/pembayaran-pinjaman"), fetch("/api/anggota")])
      .then(async ([angsuranRes, anggotaRes]) => {
        const angsuranData = await angsuranRes.json();
        const anggotaData = await anggotaRes.json();

        if (angsuranData.success) setAngsuran(angsuranData.data);
        if (anggotaData.success) {
          const map = (anggotaData.data as AnggotaItem[]).reduce(
            (acc, item) => {
              acc[item.id] = item.nama;
              return acc;
            },
            {} as Record<number, string>,
          );
          setAnggotaMap(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleInputPembayaran = async () => {
    setFormData({
      id_pinjaman: "",
      jumlah_bayar: "",
      keterangan: "Input manual bendahara",
    });
    setShowInputModal(true);
  };

  const handleSubmitPembayaran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_pinjaman || !formData.jumlah_bayar) return;

    const response = await fetch("/api/pembayaran-pinjaman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_pinjaman: Number(formData.id_pinjaman),
        jumlah_bayar: Number(formData.jumlah_bayar),
        keterangan: formData.keterangan,
      }),
    });

    if (response.ok) {
      const reload = await fetch("/api/pembayaran-pinjaman");
      const data = await reload.json();
      if (data.success) setAngsuran(data.data);
      setShowInputModal(false);
    }
  };

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat data angsuran...
      </div>
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
                  Angsuran Bendahara
                </p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Data Angsuran
                </h1>
              </div>
              <button
                type="button"
                onClick={handleInputPembayaran}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                + Input Pembayaran
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Nama Anggota</th>
                    <th className="px-6 py-4">Pinjaman</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : angsuran.slice(0, 12)).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-slate-700">
                        {new Date(item.tanggal_bayar).toLocaleDateString(
                          "id-ID",
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {anggotaMap[item.id_anggota] || "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        P-{item.id_pinjaman}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        Rp {Number(item.jumlah_bayar).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {item.keterangan || "Angsuran pinjaman"}
                      </td>
                      <td className="px-6 py-4 text-slate-700">•</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Input Pembayaran Angsuran</h2>
            <form onSubmit={handleSubmitPembayaran} className="space-y-4">
              <input
                type="number"
                placeholder="ID Pinjaman"
                value={formData.id_pinjaman}
                onChange={(e) => setFormData({ ...formData, id_pinjaman: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <input
                type="number"
                placeholder="Nominal Pembayaran"
                value={formData.jumlah_bayar}
                onChange={(e) => setFormData({ ...formData, jumlah_bayar: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <textarea
                placeholder="Keterangan"
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInputModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
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
