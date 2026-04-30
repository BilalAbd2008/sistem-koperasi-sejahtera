"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}
interface JurnalItem {
  id: number;
  tanggal_transaksi: string;
  jenis_transaksi: string;
  jumlah: number;
  tipe: string;
  keterangan: string | null;
}

export default function BendaharaJurnalPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [jurnal, setJurnal] = useState<JurnalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    jenis_transaksi: "Pembayaran Angsuran",
    jumlah: "",
    tipe: "kredit",
    keterangan: "Input manual bendahara",
  });

  const reload = async () => {
    const res = await fetch("/api/jurnal");
    const data = await res.json();
    if (data.success) setJurnal(data.data);
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) return void router.push("/");
    const parsedUser = JSON.parse(userData) as UserData;
    if (parsedUser.role !== "bendahara") return void router.push("/dashboard");
    setUser(parsedUser);
    fetch("/api/jurnal")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setJurnal(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleBuatJurnal = async () => {
    setFormData({
      jenis_transaksi: "Pembayaran Angsuran",
      jumlah: "",
      tipe: "kredit",
      keterangan: "Input manual bendahara",
    });
    setShowModal(true);
  };

  const handleSubmitJurnal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jenis_transaksi || !formData.jumlah || !formData.tipe) {
      return;
    }

    const response = await fetch("/api/jurnal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jenis_transaksi: formData.jenis_transaksi,
        jumlah: Number(formData.jumlah),
        tipe: formData.tipe,
        keterangan: formData.keterangan,
      }),
    });

    if (response.ok) {
      reload();
      setShowModal(false);
    }
  };

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat jurnal...
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
                  Jurnal Umum
                </p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Jurnal Umum
                </h1>
              </div>
              <button
                type="button"
                onClick={handleBuatJurnal}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                + Buat Jurnal
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500">
              01/06/2025 - 31/06/2025
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Transaksi</th>
                    <th className="px-6 py-4">Tipe</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : jurnal.slice(0, 12)).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-slate-700">
                        {new Date(item.tanggal_transaksi).toLocaleDateString(
                          "id-ID",
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-900">
                        {item.jenis_transaksi}
                      </td>
                      <td className="px-6 py-4 text-slate-700 capitalize">
                        {item.tipe}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        Rp {Number(item.jumlah).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {item.keterangan || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Buat Jurnal Baru</h2>
            <form onSubmit={handleSubmitJurnal} className="space-y-4">
              <input
                type="text"
                value={formData.jenis_transaksi}
                onChange={(e) => setFormData({ ...formData, jenis_transaksi: e.target.value })}
                placeholder="Jenis transaksi"
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <input
                type="number"
                value={formData.jumlah}
                onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                placeholder="Nominal"
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <select
                value={formData.tipe}
                onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
              >
                <option value="debit">Debit</option>
                <option value="kredit">Kredit</option>
              </select>
              <textarea
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="Keterangan"
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
