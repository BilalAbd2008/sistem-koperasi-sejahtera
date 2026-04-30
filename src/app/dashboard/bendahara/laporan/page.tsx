"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BendaharaSidebar from "@/components/BendaharaSidebar";
import { exportToExcel, exportToPDF } from "@/lib/export";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}
interface LaporanItem {
  id: number;
  periode_awal: string;
  periode_akhir: string;
  total_simpanan: number;
  total_pinjaman: number;
  total_bunga_pinjaman: number;
  total_biaya: number;
  total_laba_rugi: number;
  keterangan: string | null;
}

export default function BendaharaLaporanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [rows, setRows] = useState<LaporanItem[]>([]);
  const [reportType, setReportType] = useState<"neraca" | "laba-rugi" | "shu">(
    "neraca",
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) return void router.push("/");
    const parsedUser = JSON.parse(userData) as UserData;
    if (parsedUser.role !== "bendahara") return void router.push("/dashboard");
    setUser(parsedUser);
    fetch("/api/laporan-keuangan")
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
        Memuat laporan...
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
                  Laporan Keuangan
                </p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Laporan Keuangan
                </h1>
              </div>
              <div className="flex gap-2 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    const content = `Laporan Keuangan ${reportType === "neraca" ? "Neraca" : reportType === "laba-rugi" ? "Laba Rugi" : "SHU"}\n\n${rows
                      .map(
                        (item) =>
                          `Periode: ${new Date(item.periode_awal).toLocaleDateString("id-ID")} - ${new Date(item.periode_akhir).toLocaleDateString("id-ID")}\nSimpanan: Rp ${Number(item.total_simpanan || 0).toLocaleString("id-ID")}\nPinjaman: Rp ${Number(item.total_pinjaman || 0).toLocaleString("id-ID")}\nBunga: Rp ${Number(item.total_bunga_pinjaman || 0).toLocaleString("id-ID")}`,
                      )
                      .join("\n\n")}`;
                    exportToPDF(
                      content,
                      `Laporan ${reportType === "neraca" ? "Neraca" : reportType === "laba-rugi" ? "Laba Rugi" : "SHU"}`,
                      `laporan_${reportType}.pdf`,
                    );
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-100"
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const data = rows.map((item) => ({
                      periode_awal: new Date(item.periode_awal).toLocaleDateString("id-ID"),
                      periode_akhir: new Date(item.periode_akhir).toLocaleDateString("id-ID"),
                      total_simpanan: `Rp ${Number(item.total_simpanan || 0).toLocaleString("id-ID")}`,
                      total_pinjaman: `Rp ${Number(item.total_pinjaman || 0).toLocaleString("id-ID")}`,
                      total_bunga: `Rp ${Number(item.total_bunga_pinjaman || 0).toLocaleString("id-ID")}`,
                      total_biaya: `Rp ${Number(item.total_biaya || 0).toLocaleString("id-ID")}`,
                      total_laba_rugi: `Rp ${Number(item.total_laba_rugi || 0).toLocaleString("id-ID")}`,
                    }));
                    exportToExcel(data, "Laporan Keuangan", `laporan_${reportType}.xlsx`);
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                >
                  Export Excel
                </button>
              </div>
            </div>
            <div className="mt-4 flex gap-2 text-sm font-semibold">
              {[
                ["neraca", "Neraca"],
                ["laba-rugi", "Laba Rugi"],
                ["shu", "SHU"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReportType(value as typeof reportType)}
                  className={`rounded-lg px-3 py-1 ${reportType === value ? "bg-emerald-100 text-emerald-700" : "text-slate-500"}`}
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
                    <th className="px-6 py-4">Periode</th>
                    <th className="px-6 py-4">Simpanan</th>
                    <th className="px-6 py-4">Pinjaman</th>
                    <th className="px-6 py-4">Bunga</th>
                    <th className="px-6 py-4">Biaya</th>
                    <th className="px-6 py-4">Laba/Rugi</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : rows.slice(0, 12)).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-slate-700">
                        {new Date(item.periode_awal).toLocaleDateString(
                          "id-ID",
                        )}{" "}
                        -{" "}
                        {new Date(item.periode_akhir).toLocaleDateString(
                          "id-ID",
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        Rp{" "}
                        {Number(item.total_simpanan || 0).toLocaleString(
                          "id-ID",
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        Rp{" "}
                        {Number(item.total_pinjaman || 0).toLocaleString(
                          "id-ID",
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        Rp{" "}
                        {Number(item.total_bunga_pinjaman || 0).toLocaleString(
                          "id-ID",
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        Rp{" "}
                        {Number(item.total_biaya || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-700">
                        Rp{" "}
                        {Number(item.total_laba_rugi || 0).toLocaleString(
                          "id-ID",
                        )}
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
