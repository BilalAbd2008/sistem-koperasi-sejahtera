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

interface AngsuranItem {
  id: number;
  id_pinjaman?: number;
  jumlah_bayar: number;
  tanggal_bayar: string;
  keterangan: string | null;
}

interface PinjamanItem {
  id: number;
  jumlah_pinjam: number;
}

export default function AnggotaAngsuranPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [angsuran, setAngsuran] = useState<AngsuranItem[]>([]);
  const [totalPinjaman, setTotalPinjaman] = useState(0);
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

        const [angsuranRes, pinjamanRes] = await Promise.all([
          fetch(`/api/pembayaran-pinjaman?id_anggota=${anggota_id}`),
          fetch(`/api/pinjaman?id_anggota=${anggota_id}`),
        ]);
        const angsuranData = await angsuranRes.json();
        const pinjamanData = await pinjamanRes.json();

        if (angsuranData.success) {
          setAngsuran(angsuranData.data.slice(0, 10));
        }

        if (pinjamanData.success) {
          const total = (pinjamanData.data as PinjamanItem[]).reduce(
            (sum, item) => sum + Number(item.jumlah_pinjam || 0),
            0,
          );
          setTotalPinjaman(total);
        }
      } catch (error) {
        console.error("Error fetching angsuran:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat halaman angsuran...
      </div>
    );
  }

  const totalTerbayar = angsuran.reduce(
    (sum, row) => sum + Number(row.jumlah_bayar || 0),
    0,
  );
  const sisaPinjaman = Math.max(totalPinjaman - totalTerbayar, 0);
  const angsuranBerikutnya = angsuran[0]?.jumlah_bayar || 0;
  const nextDueDate = (() => {
    if (!angsuran[0]?.tanggal_bayar) return "-";
    const d = new Date(angsuran[0].tanggal_bayar);
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  })();

  let sisaBerjalan = totalPinjaman;

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex h-full">
        <MemberSidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Angsuran (Anggota)
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              Angsuran Pinjaman Saya
            </h1>
            <p className="mt-1 text-slate-600">
              Lihat angsuran yang sudah dibayarkan dan sisa pinjaman.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Sisa Pinjaman</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                Rp {sisaPinjaman.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-violet-50 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Angsuran Berikutnya</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                Rp {Number(angsuranBerikutnya).toLocaleString("id-ID")}
              </p>
              <p className="mt-1 text-xs font-semibold text-violet-700">
                Jatuh tempo {nextDueDate}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Riwayat Angsuran
              </h2>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Tanggal Bayar</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4">Status Pembayaran</th>
                    <th className="px-6 py-4">Sisa Pinjaman</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : angsuran).map((item) => {
                    sisaBerjalan = Math.max(
                      sisaBerjalan - Number(item.jumlah_bayar || 0),
                      0,
                    );

                    return (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-6 py-4 text-slate-700">
                          {new Date(item.tanggal_bayar).toLocaleDateString(
                            "id-ID",
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          Rp {Number(item.jumlah_bayar).toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {item.keterangan || "Angsuran pinjaman"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Dibayar
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          Rp {sisaBerjalan.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
