"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LupaPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message || "Permintaan berhasil diproses.");
    } catch {
      setMessage("Terjadi kesalahan server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Lupa Password</h1>
        <p className="mt-1 text-sm text-slate-600">
          Masukkan email akun Anda. Link reset akan dikirim ke email tersebut.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3"
            placeholder="Email"
            required
          />

          {message && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              {message}
            </div>
          )}

          <div className="flex gap-3">
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
              {loading ? "Mengirim..." : "Kirim Link"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
