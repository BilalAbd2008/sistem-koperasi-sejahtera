"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}
interface BukuBesarItem {
  id?: number;
  tanggal_transaksi: string;
  akun: string;
  keterangan: string | null;
  debit: number;
  kredit: number;
  saldo: number;
}

export default function BendaharaBukuBesarPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [rows, setRows] = useState<BukuBesarItem[]>([]);
  const [akun, setAkun] = useState("Kas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) return void router.push("/");
    const parsedUser = JSON.parse(userData) as UserData;
    if (parsedUser.role !== "bendahara") return void router.push("/dashboard");
    setUser(parsedUser);
    fetch("/api/buku-besar")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRows(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat buku besar...
      </div>
    );
  const saldoAkhir = rows.length ? rows[rows.length - 1]?.saldo || 0 : 0;

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Buku Besar</p>
            <h1 className="text-2xl font-bold text-slate-900">Buku Besar</h1>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select
                value={akun}
                onChange={(e) => setAkun(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2"
              >
                <option>Kas</option>
                <option>Simpanan Wajib</option>
                <option>Piutang Pinjaman</option>
              </select>
              <input
                type="text"
                value="01/06/2025 - 31/06/2025"
                readOnly
                className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500"
              />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Akun</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4">Debit</th>
                    <th className="px-6 py-4">Kredit</th>
                    <th className="px-6 py-4">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : rows.slice(0, 12)).map((item, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-slate-700">
                        {new Date(item.tanggal_transaksi).toLocaleDateString(
                          "id-ID",
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-900">{item.akun}</td>
                      <td className="px-6 py-4 text-slate-700">
                        {item.keterangan || "-"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        Rp {Number(item.debit || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        Rp {Number(item.kredit || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-700">
                        Rp {Number(item.saldo || 0).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold">
                    <td className="px-6 py-4" colSpan={5}>
                      Saldo Akhir
                    </td>
                    <td className="px-6 py-4">
                      Rp {Number(saldoAkhir).toLocaleString("id-ID")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
