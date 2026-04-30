"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

interface BendaharaStats {
  totalMembers: string;
  totalSavings: string;
  totalLoans: string;
  totalCash: string;
}

interface RecentLoan {
  nama: string;
  jumlah_pinjam: number;
  tanggal_pinjam: string;
  status: string;
}

const shortcuts = [
  { label: "Data Anggota", href: "/dashboard/bendahara/anggota" },
  { label: "Simpanan", href: "/dashboard/bendahara/simpanan" },
  { label: "Pinjaman", href: "/dashboard/bendahara/pinjaman" },
  { label: "Angsuran", href: "/dashboard/bendahara/angsuran" },
];

export default function BendaharaDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<BendaharaStats>({
    totalMembers: "0",
    totalSavings: "Rp 76.250.000",
    totalLoans: "Rp 45.000.000",
    totalCash: "Rp 12.500.000",
  });
  const [recentLoans, setRecentLoans] = useState<RecentLoan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData) as UserData;
    if (parsedUser.role !== "bendahara") {
      router.push("/dashboard");
      return;
    }

    setUser(parsedUser);

    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/dashboard/bendahara");
        const data = await response.json();
        if (data.success) {
          setStats({
            totalMembers: Number(data.data.totalMembers || 0).toLocaleString(
              "id-ID",
            ),
            totalSavings: `Rp ${Number(data.data.totalSavings || 0).toLocaleString("id-ID")}`,
            totalLoans: `Rp ${Number(data.data.totalLoans || 0).toLocaleString("id-ID")}`,
            totalCash: `Rp ${Number(data.data.totalCash || 0).toLocaleString("id-ID")}`,
          });
          setRecentLoans(data.data.recentLoans || []);
        }
      } catch (error) {
        console.error("Error fetching bendahara dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
    const timer = window.setInterval(loadDashboard, 10000);

    return () => window.clearInterval(timer);
  }, [router]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat dashboard bendahara...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />

        <main className="flex-1 overflow-hidden bg-slate-50">
          <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Dashboard Bendahara
                </p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Selamat datang, {user.nama_lengkap} 👋
                </h1>
                <p className="text-sm text-slate-500">
                  Berikut ringkasan data operasional.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-slate-200" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {user.nama_lengkap}
                  </p>
                  <p className="text-xs text-slate-500">Bendahara</p>
                </div>
              </div>
            </header>

            <section className="flex-1 overflow-hidden px-8 py-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Gunakan tombol di bawah untuk memasang data simulasi ke
                  backend.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/dev/seed-demo", { method: "POST" });
                    window.location.reload();
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Seed Data Simulasi
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title: "Total Anggota",
                    value: stats.totalMembers,
                    tone: "from-emerald-50 to-emerald-100 text-emerald-700",
                  },
                  {
                    title: "Total Simpanan",
                    value: stats.totalSavings,
                    tone: "from-sky-50 to-sky-100 text-sky-700",
                  },
                  {
                    title: "Total Pinjaman",
                    value: stats.totalLoans,
                    tone: "from-amber-50 to-amber-100 text-amber-700",
                  },
                  {
                    title: "Saldo Kas",
                    value: stats.totalCash,
                    tone: "from-violet-50 to-violet-100 text-violet-700",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-2xl border border-slate-200 bg-linear-to-br ${item.tone} p-5 shadow-sm`}
                  >
                    <p className="text-sm font-medium text-slate-500">
                      {item.title}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {loading ? "Memuat..." : item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Grafik Simpanan vs Pinjaman
                  </h2>
                  <div className="mt-6 h-56 rounded-2xl bg-slate-50 p-4">
                    <div className="flex h-full items-end gap-3">
                      {[40, 52, 58, 64, 70, 82].map((height, index) => (
                        <div key={index} className="flex-1 space-y-2">
                          <div
                            className="mx-auto w-3/4 rounded-t-xl bg-emerald-500"
                            style={{ height: `${height}%` }}
                          />
                          <div
                            className="mx-auto w-3/4 rounded-t-xl bg-sky-400"
                            style={{ height: `${Math.max(height - 18, 18)}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Pengajuan Pinjaman Terbaru
                      </h2>
                      <p className="text-sm text-slate-500">
                        Daftar pengajuan yang perlu dipantau
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      Lihat Semua
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(loading ? [] : recentLoans).map((row) => (
                      <div
                        key={`${row.nama}-${row.tanggal_pinjam}`}
                        className="grid grid-cols-4 items-center rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                      >
                        <span className="font-medium text-slate-900">
                          {row.nama}
                        </span>
                        <span className="text-slate-700">
                          Rp{" "}
                          {Number(row.jumlah_pinjam || 0).toLocaleString(
                            "id-ID",
                          )}
                        </span>
                        <span className="text-slate-500">
                          {new Date(row.tanggal_pinjam).toLocaleDateString(
                            "id-ID",
                          )}
                        </span>
                        <span className="font-semibold text-amber-600">
                          {row.status === "aktif"
                            ? "Pending"
                            : row.status === "lunas"
                              ? "Disetujui"
                              : "Ditolak"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">Pintasan</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {shortcuts.map((shortcut) => (
                    <button
                      key={shortcut.href}
                      onClick={() => router.push(shortcut.href)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
                    >
                      {shortcut.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
