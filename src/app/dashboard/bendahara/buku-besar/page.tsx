"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import BendaharaSidebar from "@/components/BendaharaSidebar";
import { LedgerViewer } from "@/components/accounting";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

export default function BendaharaBukuBesarPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) return void router.push("/");
    if (currentUser.role !== "bendahara" && currentUser.role !== "admin") return void router.push("/dashboard");
    setUser(currentUser);
    setLoading(false);
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat buku besar...
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex min-h-screen">
        <BendaharaSidebar user={user} />
        <div className="flex-1 bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Akuntansi Bendahara</p>
            <h1 className="text-2xl font-bold text-slate-900">Buku Besar</h1>
            <p className="mt-1 text-sm text-slate-500">
              Rincian transaksi per akun dari alur simpan pinjam.
            </p>
          </div>
          <LedgerViewer />
        </div>
      </div>
    </div>
  );
}
