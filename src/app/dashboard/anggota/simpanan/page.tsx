"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MemberSidebar from "@/components/MemberSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

interface SimpananItem {
  id: number;
  nama: string;
  jenis_simpanan: string;
  jumlah: number;
  tanggal_simpanan: string;
  status: string;
}

export default function AnggotaSimpananPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [simpanan, setSimpanan] = useState<SimpananItem[]>([]);
  const [activeJenis, setActiveJenis] = useState<
    "pokok" | "wajib" | "sukarela"
  >("pokok");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 5;

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData) as UserData;
    if (parsedUser.role !== "anggota") {
      router.push("/dashboard");
      return;
    }

    setUser(parsedUser);

    const loadData = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (!userData) return;
        const user = JSON.parse(userData);
        const anggota_id = user.anggota_id;

        const response = await fetch(`/api/simpanan?id_anggota=${anggota_id}`);
        const data = await response.json();
        if (data.success) {
          setSimpanan(data.data.slice(0, 8));
        }
      } catch (error) {
        console.error("Error fetching simpanan:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const summary = useMemo(() => {
    const totals = { pokok: 0, wajib: 0, sukarela: 0 };

    for (const item of simpanan) {
      const jenis = item.jenis_simpanan.toLowerCase();
      if (jenis === "pokok" || jenis === "wajib" || jenis === "sukarela") {
        totals[jenis] += Number(item.jumlah || 0);
      }
    }

    return totals;
  }, [simpanan]);

  const filteredRows = useMemo(() => {
    const rows = simpanan.filter(
      (item) => item.jenis_simpanan.toLowerCase() === activeJenis,
    );

    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [activeJenis, page, simpanan]);

  const totalPage = useMemo(() => {
    const totalRows = simpanan.filter(
      (item) => item.jenis_simpanan.toLowerCase() === activeJenis,
    ).length;
    return Math.max(1, Math.ceil(totalRows / pageSize));
  }, [activeJenis, simpanan]);

  const formatRupiah = (value: number) =>
    `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat halaman simpanan...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full">
        <MemberSidebar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Simpanan (Anggota)
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Simpanan Saya</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Simpanan Pokok</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatRupiah(summary.pokok)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-sky-50 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Simpanan Wajib</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatRupiah(summary.wajib)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Simpanan Sukarela</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatRupiah(summary.sukarela)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-6 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveJenis("pokok");
                    setPage(1);
                  }}
                  className={
                    activeJenis === "pokok"
                      ? "text-emerald-700"
                      : "text-slate-500"
                  }
                >
                  Simpanan Pokok
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveJenis("wajib");
                    setPage(1);
                  }}
                  className={
                    activeJenis === "wajib"
                      ? "text-emerald-700"
                      : "text-slate-500"
                  }
                >
                  Simpanan Wajib
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveJenis("sukarela");
                    setPage(1);
                  }}
                  className={
                    activeJenis === "sukarela"
                      ? "text-emerald-700"
                      : "text-slate-500"
                  }
                >
                  Simpanan Sukarela
                </button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Jenis Simpanan</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : filteredRows).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-slate-700">
                        {new Date(item.tanggal_simpanan).toLocaleDateString(
                          "id-ID",
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700 capitalize">
                        {item.jenis_simpanan}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatRupiah(Number(item.jumlah))}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        Setoran {item.jenis_simpanan} bulan{" "}
                        {new Date(item.tanggal_simpanan).toLocaleDateString(
                          "id-ID",
                          { month: "long", year: "numeric" },
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-2 border-t border-slate-200 px-6 py-4 text-sm">
              {Array.from({ length: totalPage }).map((_, index) => {
                const nextPage = index + 1;
                const active = nextPage === page;

                return (
                  <button
                    key={nextPage}
                    type="button"
                    onClick={() => setPage(nextPage)}
                    className={`h-8 w-8 rounded-md border ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 text-slate-600"}`}
                  >
                    {nextPage}
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
