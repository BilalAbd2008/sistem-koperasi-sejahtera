"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MemberSidebar from "@/components/MemberSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
  anggota_id?: number;
}

interface SummaryCard {
  title: string;
  value: string;
  color: string;
  subtitle: string;
}

const cardIconPaths = [
  "M4 6h16v12H4z M7 9h10M7 12h6",
  "M12 2 4 6v4c0 5.5 3.3 10 8 12 4.7-2 8-6.5 8-12V6l-8-4Z",
  "M7 4h10a2 2 0 0 1 2 2v12H5V6a2 2 0 0 1 2-2Zm1 4h8M8 12h8",
  "M7 2h10v4H7z M4 8h16v12H4z",
];

export default function AnggotaDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [summaryCards, setSummaryCards] = useState<SummaryCard[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<
    Array<{ label: string; date: string; amount: string; color: string }>
  >([]);
  const [announcements, setAnnouncements] = useState<
    Array<{
      title: string;
      date: string;
      description: string;
      tone: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

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

    const loadDashboard = async () => {
      try {
        const response = await fetch(
          `/api/dashboard/anggota?id_anggota=${parsedUser.anggota_id || ""}`,
        );
        const data = await response.json();

        if (data.success) {
          setSummaryCards(data.data.summary);
          setRecentTransactions(
            data.data.recentTransactions.map((item: any) => ({
              label: item.label,
              date: new Date(item.date).toLocaleDateString("id-ID"),
              amount: `Rp ${Number(item.amount || 0).toLocaleString("id-ID")}`,
              color:
                item.tone === "emerald" ? "text-emerald-600" : "text-amber-600",
            })),
          );
          setAnnouncements(data.data.announcements);
        }
      } catch (error) {
        console.error("Error fetching member dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
    const timer = window.setInterval(loadDashboard, 10000);

    return () => window.clearInterval(timer);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat dashboard anggota...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full">
        <MemberSidebar user={user} />

        <main className="flex-1 overflow-hidden bg-slate-50">
          <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Dashboard Anggota
                </p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Selamat datang, {user.nama_lengkap} 👋
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Berikut informasi ringkasan akun Anda.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Logout
                </button>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2 shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {user.nama_lengkap}
                    </p>
                    <p className="text-xs text-slate-500">Anggota</p>
                  </div>
                </div>
              </div>
            </header>

            <section className="flex-1 overflow-hidden px-8 py-6">
              <div className="grid h-full grid-rows-[auto_auto_1fr] gap-6">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                  {summaryCards.map((card, idx) => (
                    <div
                      key={card.title}
                      className={`rounded-2xl border border-slate-200 bg-linear-to-br ${card.color} p-5 shadow-sm`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-500">
                            {card.title}
                          </p>
                          <p className="mt-2 text-2xl font-bold text-slate-900">
                            {card.value}
                          </p>
                          <button
                            type="button"
                            className="mt-4 text-sm font-semibold text-slate-700 hover:text-slate-900"
                          >
                            {card.subtitle} →
                          </button>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-slate-700">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            aria-hidden="true"
                          >
                            <path d={cardIconPaths[idx] || cardIconPaths[0]} />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Riwayat Transaksi Terakhir
                        </h2>
                        <p className="text-sm text-slate-500">
                          Aktivitas simpanan dan pinjaman terbaru
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Lihat Semua
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(loading ? [] : recentTransactions).map((item, idx) => (
                        <div
                          key={`${item.label}-${item.date}-${idx}`}
                          className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white ${item.color}`}
                            >
                              <span className="h-2.5 w-2.5 rounded-full bg-current" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.label}
                              </p>
                              <p className="text-sm text-slate-500">
                                {item.date}
                              </p>
                            </div>
                          </div>
                          <p className={`text-sm font-bold ${item.color}`}>
                            {item.amount}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Pengumuman Terbaru
                        </h2>
                        <p className="text-sm text-slate-500">
                          Informasi penting dari koperasi
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Lihat Semua
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(loading ? [] : announcements).map((item) => (
                        <div
                          key={item.title}
                          className="rounded-2xl border border-slate-200 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className={`font-semibold ${item.tone}`}>
                                {item.title}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {item.description}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-slate-400">
                              {item.date}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
