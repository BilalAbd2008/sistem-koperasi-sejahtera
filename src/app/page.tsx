"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push(
          data.user.role === "anggota"
            ? "/dashboard/anggota"
            : data.user.role === "bendahara"
              ? "/dashboard/bendahara"
              : "/dashboard",
        );
      } else {
        setError(data.error || "Login gagal");
      }
    } catch {
      setError("Terjadi kesalahan server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-[#f5f7fb] px-4 py-4 font-(family-name:--font-geist-sans) md:px-8 md:py-6">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-[0_25px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur md:gap-14 md:p-8 lg:p-10">
        <section className="hidden w-full max-w-xl md:block md:text-left">
          <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-inner shadow-emerald-100">
            <svg
              viewBox="0 0 24 24"
              className="h-14 w-14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4.5 10.3V5.8L12 2l7.5 3.8v4.5c0 5.9-3.6 9.9-7.5 11.7-3.9-1.8-7.5-5.8-7.5-11.7Z" />
              <path d="M7.8 11.5c0-1.5 1.2-2.7 2.7-2.7s2.7 1.2 2.7 2.7-1.2 2.7-2.7 2.7-2.7-1.2-2.7-2.7Z" />
              <path d="M12.2 8.8c.5-1.1 1.5-1.8 2.7-1.8 1.7 0 3 1.3 3 3v1.5" />
              <path d="M5.2 11.5V10c0-1.7 1.3-3 3-3" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold leading-tight text-slate-800 md:text-4xl">
            KOPERASI SEJAHTERA BERSAMA
          </h1>
          <p className="mt-2 text-xl font-semibold text-slate-700">
            Sistem Informasi Koperasi
          </p>
          <p className="text-xl text-slate-700">Simpan Pinjam</p>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-linear-to-br from-slate-50 to-emerald-50 p-4 shadow-inner">
            <svg
              viewBox="0 0 640 360"
              className="h-auto w-full"
              role="img"
              aria-label="Ilustrasi keamanan dana anggota"
            >
              <rect
                x="240"
                y="84"
                width="210"
                height="190"
                rx="20"
                fill="#244b66"
              />
              <rect
                x="268"
                y="110"
                width="154"
                height="136"
                rx="12"
                fill="#2f627f"
              />
              <circle cx="345" cy="178" r="30" fill="#dceaf3" />
              <circle cx="345" cy="178" r="16" fill="#87a9be" />
              <rect
                x="72"
                y="180"
                width="54"
                height="122"
                rx="20"
                fill="#7ea6d3"
              />
              <circle cx="99" cy="154" r="24" fill="#f8c7a4" />
              <rect
                x="474"
                y="178"
                width="44"
                height="124"
                rx="20"
                fill="#5fb476"
              />
              <circle cx="496" cy="152" r="24" fill="#f2bd9b" />
              <ellipse cx="332" cy="304" rx="272" ry="24" fill="#dce8f5" />
              <circle cx="176" cy="292" r="18" fill="#f3c14f" />
              <circle cx="208" cy="298" r="15" fill="#f3c14f" />
              <circle cx="450" cy="296" r="17" fill="#f3c14f" />
            </svg>
          </div>
        </section>

        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.5)] md:p-7">
          <h2 className="text-2xl font-bold text-slate-800">
            Login ke Akun Anda
          </h2>

          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Username atau Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 px-4 text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="Masukkan username atau email"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 pr-12 text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c7 0 10 8 10 8a17.4 17.4 0 0 1-4.1 5.3" />
                      <path d="M6.3 6.3A17.7 17.7 0 0 0 2 12s3 8 10 8a9.8 9.8 0 0 0 5.7-1.8" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M1.5 12S4.5 4 12 4s10.5 8 10.5 8-3 8-10.5 8S1.5 12 1.5 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => router.push("/lupa-password")}
                  className="text-sm font-semibold text-sky-600 transition hover:text-sky-700"
                >
                  Lupa password?
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Pilih Role (optional)
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="" disabled>
                    Pilih role
                  </option>
                  <option value="anggota">Anggota</option>
                  <option value="admin">Admin</option>
                  <option value="bendahara">Bendahara</option>
                  <option value="pengurus">Pengurus</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5.2 7.7a1 1 0 0 1 1.4 0L10 11l3.4-3.3a1 1 0 1 1 1.4 1.4l-4.1 4a1 1 0 0 1-1.4 0l-4.1-4a1 1 0 0 1 0-1.4Z" />
                </svg>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Login"}
            </button>

            <p className="text-center text-sm text-slate-600">
              Belum punya akun?{" "}
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Daftar sebagai anggota
              </button>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
