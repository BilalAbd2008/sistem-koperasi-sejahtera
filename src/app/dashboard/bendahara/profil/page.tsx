"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
  email?: string;
}

export default function BendaharaProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [form, setForm] = useState({
    nama_lengkap: "",
    username: "",
    email: "",
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return void router.push("/");
    if (user.role !== "bendahara" && user.role !== "admin") return void router.push("/dashboard");
    setUser(user);
    setForm({
      nama_lengkap: user.nama_lengkap,
      username: user.username,
      email: user.email || "",
    });
  }, [router]);

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat profil bendahara...
      </div>
    );
  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Profil Saya</p>
            <h1 className="text-2xl font-bold text-slate-900">Profil Saya</h1>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Informasi Pribadi
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">
                    Nama Lengkap
                  </label>
                  <input
                    value={form.nama_lengkap}
                    onChange={(e) =>
                      setForm({ ...form, nama_lengkap: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">
                    Username
                  </label>
                  <input
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">
                    Email
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </div>
                <button className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white">
                  Simpan Perubahan
                </button>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-emerald-50 to-sky-50 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Aksi Akun</h2>
              <p className="mt-2 text-sm text-slate-600">
                Ubah profil dan password dapat dikembangkan di tahap berikutnya.
              </p>
              <div className="mt-5 space-y-3">
                <button className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white">
                  Ubah Profil
                </button>
                <button className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700">
                  Ubah Password
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
