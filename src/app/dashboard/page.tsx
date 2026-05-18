"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface DashboardStats {
  totalMembers: number;
  totalSavings: number;
  totalLoans: number;
  totalInterest: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    nama_lengkap: string;
    role: string;
  } | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalSavings: 0,
    totalLoans: 0,
    totalInterest: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/");
      return;
    }

    if (user.role === "anggota") {
      router.push("/");
      return;
    }

    if (user.role === "bendahara") {
      router.push("/dashboard/bendahara");
      return;
    }

    // The dashboard entry route is only for admin-like roles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(user);

    fetchStats();
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white shadow-sm p-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Selamat datang, {user.nama_lengkap}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="p-6">
          {loading ? (
            <div className="text-center">Memuat data...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Members */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">
                      Total Anggota
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.totalMembers}
                    </p>
                  </div>
                  <div className="bg-blue-100 rounded-lg p-3">
                    <svg
                      className="w-8 h-8 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Savings */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">
                      Total Simpanan
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      Rp {(stats.totalSavings / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-3">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Loans */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">
                      Total Pinjaman
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      Rp {(stats.totalLoans / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="bg-yellow-100 rounded-lg p-3">
                    <svg
                      className="w-8 h-8 text-yellow-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M8.16 2.75a1 1 0 00-.32 1.67c.5.35.88.97.88 1.58 0 1.11-.89 2-2 2-1.11 0-2-.89-2-2 0-1.11.89-2 2-2 .61 0 1.23.38 1.58.88.5.5 1.17.5 1.67 0s.5-1.17 0-1.67A4 4 0 004.75 1h10.5a1 1 0 010 2H4.75zM18 5a1 1 0 00-1 1v8a2 2 0 01-2 2H5a2 2 0 01-2-2V6a1 1 0 000-2h14a1 1 0 001 1v8a1 1 0 01-2 0V6a1 1 0 001-1z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Interest */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">
                      Total Bunga
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      Rp {(stats.totalInterest / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="bg-purple-100 rounded-lg p-3">
                    <svg
                      className="w-8 h-8 text-purple-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M8.5 5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm6.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 12a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/simpanan">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900">
                  Simpanan
                </h3>
                <p className="text-gray-600 text-sm mt-2">
                  Kelola data simpanan anggota
                </p>
              </div>
            </Link>

            <Link href="/pinjaman">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900">
                  Pinjaman
                </h3>
                <p className="text-gray-600 text-sm mt-2">
                  Kelola data pinjaman anggota
                </p>
              </div>
            </Link>

            <Link href="/anggota">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                <h3 className="text-lg font-semibold text-gray-900">Anggota</h3>
                <p className="text-gray-600 text-sm mt-2">
                  Kelola data anggota koperasi
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
