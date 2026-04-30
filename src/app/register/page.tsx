"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nama_lengkap: "",
    username: "",
    email: "",
    password: "",
    no_telepon: "",
    alamat: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registrasi gagal");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard/anggota");
    } catch {
      setError("Terjadi kesalahan server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Daftar Anggota</h1>
        <p className="mt-1 text-sm text-slate-600">
          Isi form berikut untuk membuat akun anggota.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <input
            value={form.nama_lengkap}
            onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Nama lengkap"
            required
          />
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Username"
            required
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Password"
            required
          />
          <input
            value={form.no_telepon}
            onChange={(e) => setForm({ ...form, no_telepon: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="No. telepon"
          />
          <textarea
            value={form.alamat}
            onChange={(e) => setForm({ ...form, alamat: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Alamat"
            rows={3}
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Daftar"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
