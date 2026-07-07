"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  id: number;
  nama_lengkap: string;
  username: string;
  role: string;
  email?: string;
}

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

const resetConfirmationText = "RESET DATA";
const profileRoles = ["bendahara", "ketua_koperasi"];

export default function BendaharaProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [resettingDatabase, setResettingDatabase] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [resetNotice, setResetNotice] = useState<Notice>(null);
  const [form, setForm] = useState({
    nama_lengkap: "",
    username: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [resetForm, setResetForm] = useState({
    confirmation: "",
    password: "",
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return void router.push("/");
    if (!profileRoles.includes(user.role)) return void router.push("/");
    // Session data lives in localStorage, so the profile form is hydrated on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(user);
    setForm({
      nama_lengkap: user.nama_lengkap,
      username: user.username,
      email: user.email || "",
    });
  }, [router]);

  const syncLocalUser = (updatedUser: UserData) => {
    const users = JSON.parse(localStorage.getItem("users") || "[]") as UserData[];
    const nextUsers = users.map((item) =>
      item.role === updatedUser.role ? { ...item, ...updatedUser } : item,
    );
    localStorage.setItem("users", JSON.stringify(nextUsers));
    setUser(updatedUser);
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setProfileNotice(null);

    try {
      const response = await fetch("/api/bendahara/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          nama_lengkap: form.nama_lengkap,
          username: form.username,
          email: form.email,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setProfileNotice({
          type: "error",
          message: result.error || "Profil gagal diperbarui",
        });
        return;
      }

      const updatedUser = { ...user, ...result.user };
      syncLocalUser(updatedUser);
      setProfileNotice({
        type: "success",
        message: result.message || "Profil berhasil diperbarui",
      });
    } catch {
      setProfileNotice({
        type: "error",
        message: "Terjadi kesalahan saat menyimpan profil",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!user) return;

    setPasswordNotice(null);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordNotice({
        type: "error",
        message: "Konfirmasi password baru tidak sama",
      });
      return;
    }

    setSavingPassword(true);

    try {
      const response = await fetch("/api/bendahara/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setPasswordNotice({
          type: "error",
          message: result.error || "Password gagal diperbarui",
        });
        return;
      }

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setPasswordNotice({
        type: "success",
        message: result.message || "Password berhasil diperbarui",
      });
    } catch {
      setPasswordNotice({
        type: "error",
        message: "Terjadi kesalahan saat mengubah password",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleResetDatabase = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!user || resetForm.confirmation !== resetConfirmationText) return;

    setResettingDatabase(true);
    setResetNotice(null);

    try {
      const response = await fetch("/api/bendahara/reset-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: user.role,
          username: user.username,
          password: resetForm.password,
          confirmation: resetForm.confirmation,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setResetNotice({
          type: "error",
          message: result.error || "Gagal reset database",
        });
        return;
      }

      setResetForm({ confirmation: "", password: "" });
      setResetNotice({
        type: "success",
        message:
          "Database berhasil direset. Data koperasi sudah kosong dan akun default dibuat ulang.",
      });
    } catch {
      setResetNotice({
        type: "error",
        message: "Terjadi kesalahan saat reset database",
      });
    } finally {
      setResettingDatabase(false);
    }
  };

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat profil...
      </div>
    );
  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5 md:px-8">
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                  {user.role === "ketua_koperasi" ? "Ketua Koperasi" : "Bendahara"}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                  Profil Saya
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {user.username} - {user.email || "Email belum diisi"}
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-7 w-7" />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleProfileSubmit}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Informasi Akun
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Data ini digunakan untuk login dan identitas akun.
                  </p>
                </div>
              </div>

              {profileNotice ? (
                <div
                  className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${
                    profileNotice.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {profileNotice.message}
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">
                    Nama Lengkap
                  </label>
                  <input
                    value={form.nama_lengkap}
                    onChange={(e) =>
                      setForm({ ...form, nama_lengkap: e.target.value })
                    }
                    className="h-12 w-full rounded-lg border border-slate-200 px-4 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    required
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
                    className="h-12 w-full rounded-lg border border-slate-200 px-4 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="h-12 w-full rounded-lg border border-slate-200 px-11 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Save className="h-4 w-4" />
                  {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>

            <form
              onSubmit={handlePasswordSubmit}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Keamanan Akun
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Masukkan password lama sebelum mengganti password.
                  </p>
                </div>
              </div>

              {passwordNotice ? (
                <div
                  className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${
                    passwordNotice.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {passwordNotice.message}
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">
                    Password Lama
                  </label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        current_password: e.target.value,
                      })
                    }
                    className="h-12 w-full rounded-lg border border-slate-200 px-4 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        new_password: e.target.value,
                      })
                    }
                    className="h-12 w-full rounded-lg border border-slate-200 px-4 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirm_password: e.target.value,
                      })
                    }
                    className="h-12 w-full rounded-lg border border-slate-200 px-4 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <KeyRound className="h-4 w-4" />
                  {savingPassword ? "Mengubah..." : "Ubah Password"}
                </button>
              </div>
            </form>
          </div>

          {user.role === "bendahara" ? (
            <form
              onSubmit={handleResetDatabase}
              className="mt-6 rounded-lg border border-red-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
                    <TriangleAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                      Zona Berbahaya
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      Reset Semua Data
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                      Menghapus seluruh data anggota, simpanan, pinjaman, utang
                      toko, jurnal, laporan keuangan, pengumuman, dan SHU. Akun
                      login default serta daftar akun akuntansi dasar akan dibuat
                      ulang.
                    </p>
                  </div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-700">
                  <Database className="h-5 w-5" />
                </div>
              </div>

              {resetNotice ? (
                <div
                  className={`mt-5 rounded-lg border px-4 py-3 text-sm font-semibold ${
                    resetNotice.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {resetNotice.message}
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-1 block">
                    Ketik {resetConfirmationText}
                  </span>
                  <input
                    value={resetForm.confirmation}
                    onChange={(event) =>
                      setResetForm({
                        ...resetForm,
                        confirmation: event.target.value,
                      })
                    }
                    className="h-12 w-full rounded-lg border border-red-200 px-4 text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    placeholder={resetConfirmationText}
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-1 block">Password akun {user.username}</span>
                  <input
                    type="password"
                    value={resetForm.password}
                    onChange={(event) =>
                      setResetForm({ ...resetForm, password: event.target.value })
                    }
                    className="h-12 w-full rounded-lg border border-red-200 px-4 text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    placeholder="Masukkan password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    resettingDatabase ||
                    resetForm.confirmation !== resetConfirmationText ||
                    resetForm.password.length === 0
                  }
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  <Database className="h-4 w-4" />
                  {resettingDatabase ? "Mereset..." : "Reset Database"}
                </button>
              </div>
            </form>
          ) : null}
        </main>
      </div>
    </div>
  );
}
