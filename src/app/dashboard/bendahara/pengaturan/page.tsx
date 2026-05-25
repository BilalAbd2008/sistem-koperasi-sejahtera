"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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

const resetConfirmationText = "RESET DATA";

export default function BendaharaPengaturanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [tab, setTab] = useState<"sistem" | "notifikasi" | "pinjaman">(
    "sistem",
  );
  const [loading, setLoading] = useState(true);
  const [resetText, setResetText] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [formData, setFormData] = useState({
    key_setting: "limit_transfer",
    value_setting: "5000000",
    deskripsi: "Limit default transfer koperasi",
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return void router.push("/");
    if (user.role !== "bendahara" && user.role !== "admin") return void router.push("/dashboard");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(user);
    fetch("/api/pengaturan")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSettings(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const loadSettings = async () => {
    const response = await fetch("/api/pengaturan");
    const data = await response.json();
    if (data.success) setSettings(data.data);
  };

  const handleSave = async () => {
    await fetch("/api/pengaturan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    await loadSettings();
  };

  const handleResetDatabase = async () => {
    if (!user || resetText !== resetConfirmationText) return;

    setResetting(true);
    setResetMessage("");
    try {
      const response = await fetch("/api/admin/reset-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: user.role,
          username: user.username,
          password: resetPassword,
          confirmation: resetText,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal reset database");
      }

      setResetText("");
      setResetPassword("");
      setResetMessage("Database berhasil direset. Data anggota, simpanan, pinjaman, jurnal, laporan, dan SHU sudah kosong.");
      await loadSettings();
    } catch (error) {
      setResetMessage(String(error));
    } finally {
      setResetting(false);
    }
  };

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat pengaturan...
      </div>
    );
  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-6">
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
            <div className="space-y-6">
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

              <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-500">
                  Zona Berbahaya
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  Reset Semua Data
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Menghapus seluruh data anggota, simpanan, pinjaman, utang toko,
                  jurnal, laporan keuangan, pengumuman, dan SHU. Akun login default
                  serta daftar akun akuntansi dasar akan dibuat ulang.
                </p>
                <label className="mt-5 block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block">
                    Ketik {resetConfirmationText} untuk membuka tombol reset
                  </span>
                  <input
                    value={resetText}
                    onChange={(event) => setResetText(event.target.value)}
                    className="w-full rounded-xl border border-red-200 px-4 py-3 text-slate-900 outline-none focus:border-red-500"
                    placeholder={resetConfirmationText}
                  />
                </label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  <span className="mb-2 block">Password akun {user.username}</span>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    className="w-full rounded-xl border border-red-200 px-4 py-3 text-slate-900 outline-none focus:border-red-500"
                    placeholder="Masukkan password untuk konfirmasi"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleResetDatabase}
                  disabled={
                    resetting ||
                    resetText !== resetConfirmationText ||
                    resetPassword.length === 0
                  }
                  className="mt-4 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {resetting ? "Mereset Database..." : "Reset Database dari Nol"}
                </button>
                {resetMessage ? (
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    {resetMessage}
                  </p>
                ) : null}
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
