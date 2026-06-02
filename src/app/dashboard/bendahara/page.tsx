"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Bookmark,
  CalendarCheck,
  Landmark,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

interface DashboardCardData {
  count: number;
  total: number;
}

interface BendaharaStats {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  estimatedShu: number;
  totalSavings: number;
  totalLoans: number;
  totalCash: number;
  totalMembers: number;
  cards: {
    wajib: DashboardCardData;
    pokok: DashboardCardData;
    sukarela: DashboardCardData;
    pinjaman: DashboardCardData;
  };
}

const defaultStats: BendaharaStats = {
  totalAssets: 0,
  totalLiabilities: 0,
  totalEquity: 0,
  estimatedShu: 0,
  totalSavings: 0,
  totalLoans: 0,
  totalCash: 0,
  totalMembers: 0,
  cards: {
    wajib: { count: 0, total: 0 },
    pokok: { count: 0, total: 0 },
    sukarela: { count: 0, total: 0 },
    pinjaman: { count: 0, total: 0 },
  },
};

const formatCurrency = (value: number) =>
  `Rp. ${Number(value || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = () =>
  new Date().toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function BendaharaDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<BendaharaStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(formatDateTime());

  const loadDashboard = async () => {
    try {
      const response = await fetch("/api/dashboard/bendahara");
      const data = await response.json();

      if (data.success) {
        setStats({
          ...defaultStats,
          ...data.data,
          cards: {
            ...defaultStats.cards,
            ...(data.data.cards || {}),
          },
        });
        setUpdatedAt(formatDateTime());
      }
    } catch (error) {
      console.error("Error fetching bendahara dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }

    if (currentUser.role !== "bendahara" && currentUser.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    const userTimer = window.setTimeout(() => setUser(currentUser), 0);
    const dashboardTimer = window.setTimeout(loadDashboard, 0);
    const timer = window.setInterval(loadDashboard, 10000);

    return () => {
      window.clearTimeout(userTimer);
      window.clearTimeout(dashboardTimer);
      window.clearInterval(timer);
    };
  }, [router]);

  const overviewItems = useMemo(
    () => [
      {
        label: "Simpanan Wajib",
        value: stats.cards.wajib.total,
        color: "#246bfe",
      },
      {
        label: "Simpanan Pokok",
        value: stats.cards.pokok.total,
        color: "#25c269",
      },
      {
        label: "Simpanan Sukarela",
        value: stats.cards.sukarela.total,
        color: "#ffc148",
      },
      {
        label: "Pinjaman",
        value: stats.cards.pinjaman.total,
        color: "#ff6b4a",
      },
    ],
    [stats],
  );
  const overviewTotal = overviewItems.reduce((sum, item) => sum + item.value, 0);
  let donutOffset = 25;
  const donutSegments = overviewItems.map((item) => {
    const percent = overviewTotal > 0 ? (item.value / overviewTotal) * 100 : 25;
    const segment = {
      ...item,
      percent,
      dasharray: `${percent} ${100 - percent}`,
      dashoffset: donutOffset,
    };
    donutOffset -= percent;
    return segment;
  });

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat dashboard bendahara...
      </div>
    );
  }

  const financeCards = [
    {
      title: "Total Aktiva",
      value: stats.totalAssets,
      accent: "border-l-orange-400 bg-orange-50 text-orange-600",
    },
    {
      title: "Total Ekuitas",
      value: stats.totalEquity,
      accent: "border-l-violet-500 bg-violet-50 text-violet-600",
    },
    {
      title: "Total Kewajiban",
      value: stats.totalLiabilities,
      accent: "border-l-emerald-500 bg-emerald-50 text-emerald-600",
    },
    {
      title: "Estimasi SHU Koperasi",
      value: stats.estimatedShu,
      accent: "border-l-sky-500 bg-sky-50 text-sky-600",
    },
  ];
  const actionCards = [
    {
      label: "Simpanan Wajib",
      value: stats.cards.wajib.count,
      total: stats.cards.wajib.total,
      icon: Bookmark,
      href: "/dashboard/bendahara/simpanan",
      accent: "bg-sky-100 text-sky-700",
    },
    {
      label: "Simpanan Pokok",
      value: stats.cards.pokok.count,
      total: stats.cards.pokok.total,
      icon: CalendarCheck,
      href: "/dashboard/bendahara/simpanan",
      accent: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Simpanan Sukarela",
      value: stats.cards.sukarela.count,
      total: stats.cards.sukarela.total,
      icon: ArrowRightToLine,
      href: "/dashboard/bendahara/simpanan",
      accent: "bg-amber-100 text-amber-700",
    },
    {
      label: "Pinjaman",
      value: stats.cards.pinjaman.count,
      total: stats.cards.pinjaman.total,
      icon: ArrowLeftToLine,
      href: "/dashboard/bendahara/pinjaman",
      accent: "bg-rose-100 text-rose-700",
    },
  ];

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex min-h-screen">
        <BendaharaSidebar user={user} />

        <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-3 sm:px-4 lg:px-5">
          <div className="w-full">
            <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-500">
                    Dashboard Bendahara
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-slate-900">
                    Selamat Datang di Koperasi PRI BDAPK Cinagara
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Hai, <span className="font-semibold text-slate-800">{user.nama_lengkap || "Bendahara Koperasi"}</span>
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-500">{updatedAt}</span>
                    <button
                      type="button"
                      onClick={loadDashboard}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      Reload
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/bendahara/laporan")}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
                >
                  Detail Laporan
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {financeCards.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => router.push("/dashboard/bendahara/laporan")}
                    className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.accent}`}
                  >
                    <span className="block text-sm font-semibold text-slate-500">
                      {item.title}
                    </span>
                    <span className="mt-3 block break-words text-2xl font-bold text-slate-900">
                      {loading ? "Memuat..." : formatCurrency(item.value)}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {actionCards.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-500">
                          {item.label}
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                          {loading ? "-" : item.value.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.accent}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <span className="mt-5 block truncate rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                      {loading ? "Memuat..." : formatCurrency(item.total)}
                    </span>
                  </button>
                );
              })}
            </section>

            <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
              <button
                type="button"
                onClick={() => router.push("/dashboard/bendahara/simpanan")}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Total Dana
                    </p>
                    <p className="mt-3 break-words text-3xl font-bold text-slate-900">
                      {loading ? "Memuat..." : formatCurrency(stats.totalSavings)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Akumulasi simpanan aktif dari data simpanan nasabah.
                    </p>
                  </div>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <WalletCards className="h-7 w-7" />
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Nasabah Aktif", stats.totalMembers.toLocaleString("id-ID")],
                    ["Saldo Kas", formatCurrency(stats.totalCash)],
                    ["Pinjaman Aktif", formatCurrency(stats.totalLoans)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <p className="text-xs font-semibold text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 truncate text-sm font-bold text-slate-900">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </button>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      Ringkasan Kartu
                    </p>
                    <h2 className="text-lg font-bold text-slate-900">
                      Komposisi Dana
                    </h2>
                  </div>
                  <Landmark className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center">
                  <svg viewBox="0 0 42 42" className="mx-auto h-28 w-28 shrink-0 -rotate-90 sm:mx-0">
                    <circle
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      stroke="#eef2f7"
                      strokeWidth="3.8"
                    />
                    {donutSegments.map((item) => (
                      <circle
                        key={item.label}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="3.8"
                        strokeDasharray={item.dasharray}
                        strokeDashoffset={item.dashoffset}
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  <div className="min-w-0 flex-1 space-y-2">
                    {donutSegments.map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="w-11 shrink-0 font-semibold text-slate-400">
                          {Math.round(item.percent)}%
                        </span>
                        <span className="min-w-0 flex-1 truncate text-slate-600">
                          {item.label}
                        </span>
                      </div>
                    ))}
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
