"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MemberSidebar from "@/components/MemberSidebar";

interface UserData {
  id: number;
  anggota_id?: number;
  nama_lengkap: string;
  username: string;
  role: string;
  email?: string;
}

interface ProfileData {
  nama_lengkap: string;
  username: string;
  email: string;
  no_telepon: string;
  alamat: string;
  no_anggota: string;
  status: string;
}

export default function AnggotaProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<ProfileData>({
    nama_lengkap: "",
    username: "",
    email: "",
    no_telepon: "",
    alamat: "",
    no_anggota: "",
    status: "aktif",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

    if (!parsedUser.anggota_id) {
      setError("Data anggota tidak ditemukan. Silakan login ulang.");
      setLoading(false);
      return;
    }

    setUser(parsedUser);

    const loadProfile = async () => {
      try {
        const response = await fetch(
          `/api/anggota/profile?user_id=${parsedUser.id}&anggota_id=${parsedUser.anggota_id}`,
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Gagal memuat profil");
          return;
        }

        setProfile({
          nama_lengkap: data.data.nama_lengkap || "",
          username: data.data.username || "",
          email: data.data.email || "",
          no_telepon: data.data.no_telepon || "",
          alamat: data.data.alamat || "",
          no_anggota: data.data.no_anggota || "",
          status: data.data.status || "aktif",
        });
      } catch {
        setError("Terjadi kesalahan server");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.anggota_id) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/anggota/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          anggota_id: user.anggota_id,
          nama_lengkap: profile.nama_lengkap,
          username: profile.username,
          email: profile.email,
          no_telepon: profile.no_telepon,
          alamat: profile.alamat,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Gagal menyimpan profil");
        return;
      }

      const nextUser = {
        ...user,
        nama_lengkap: profile.nama_lengkap,
        username: profile.username,
        email: profile.email,
      };
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      setMessage("Profil berhasil diperbarui");
    } catch {
      setError("Terjadi kesalahan server");
    } finally {
      setSaving(false);
    }
  };

  if (!user && loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat profil...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full">
        <MemberSidebar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Profil (Anggota)</p>
            <h1 className="text-2xl font-bold text-slate-900">Profil Saya</h1>
            <p className="mt-1 text-slate-600">Perbarui data akun Anda di sini.</p>
          </div>

          <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Informasi Akun</h2>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">No. Anggota</label>
                  <input value={profile.no_anggota} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" disabled />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">Nama Lengkap</label>
                  <input
                    value={profile.nama_lengkap}
                    onChange={(e) => setProfile({ ...profile, nama_lengkap: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">Username</label>
                  <input
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">No. Telepon</label>
                  <input
                    value={profile.no_telepon}
                    onChange={(e) => setProfile({ ...profile, no_telepon: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-600">Alamat</label>
                  <textarea
                    value={profile.alamat}
                    onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-emerald-50 to-sky-50 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Aksi</h2>
              <p className="mt-2 text-sm text-slate-600">
                Status akun Anda saat ini: <span className="font-semibold capitalize">{profile.status}</span>
              </p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
