"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import BendaharaSidebar from "@/components/BendaharaSidebar";
import { NercaReport, LabaRugiReport } from "@/components/accounting";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

type ReportTab = "neraca" | "labarugi";
const allowedRoles = ["bendahara", "ketua_koperasi"];

export default function BendaharaLaporanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("neraca");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) return void router.push("/");
    if (!allowedRoles.includes(currentUser.role)) {
      return void router.push("/");
    }

    setUser(currentUser);
    setLoading(false);
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat laporan...
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex min-h-screen">
        <BendaharaSidebar user={user} />
        <div className="flex-1 bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Laporan Keuangan
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              {activeTab === "neraca" ? "Neraca" : "Laporan Laba Rugi"}
            </h1>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <button
              onClick={() => setActiveTab("neraca")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "neraca"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Neraca Posisi
            </button>
            <button
              onClick={() => setActiveTab("labarugi")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "labarugi"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Laba Rugi
            </button>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === "neraca" && <NercaReport />}
            {activeTab === "labarugi" && <LabaRugiReport />}
          </div>
        </div>
      </div>
    </div>
  );
}
