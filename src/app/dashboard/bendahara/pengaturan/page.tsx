"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}
interface SettingItem {
  id: number;
  key_setting: string;
  value_setting: string | null;
  deskripsi: string | null;
}

export default function BendaharaPengaturanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [tab, setTab] = useState<"sistem" | "notifikasi" | "pinjaman">(
    "sistem",
  );
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    key_setting: "limit_transfer",
    value_setting: "5000000",
    deskripsi: "Limit default transfer koperasi",
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) return void router.push("/");
    const parsedUser = JSON.parse(userData) as UserData;
    if (parsedUser.role !== "bendahara") return void router.push("/dashboard");
    setUser(parsedUser);
    fetch("/api/pengaturan")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSettings(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async () => {
    await fetch("/api/pengaturan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const response = await fetch("/api/pengaturan");
    const data = await response.json();
    if (data.success) setSettings(data.data);
  };

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat pengaturan...
      </div>
    );
  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Pengaturan Sistem
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
            <div className="mt-4 flex gap-2 text-sm font-semibold">
              {[
                ["sistem", "Sistem"],
                ["notifikasi", "Notifikasi"],
                ["pinjaman", "Pinjaman"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key as typeof tab)}
                  className={`rounded-lg px-3 py-1 ${tab === key ? "bg-emerald-100 text-emerald-700" : "text-slate-500"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Tambah / Ubah Pengaturan
              </h2>
              <div className="mt-4 space-y-4">
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  value={formData.key_setting}
                  onChange={(e) =>
                    setFormData({ ...formData, key_setting: e.target.value })
                  }
                  placeholder="Key setting"
                />
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  value={formData.value_setting}
                  onChange={(e) =>
                    setFormData({ ...formData, value_setting: e.target.value })
                  }
                  placeholder="Value"
                />
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Deskripsi"
                />
                <button
                  onClick={handleSave}
                  className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Daftar Pengaturan
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {(loading ? [] : settings).map((item) => (
                  <div key={item.id} className="px-6 py-4">
                    <p className="font-semibold text-slate-900">
                      {item.key_setting}
                    </p>
                    <p className="text-sm text-slate-600">
                      {item.value_setting}
                    </p>
                    <p className="text-xs text-slate-400">{item.deskripsi}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
