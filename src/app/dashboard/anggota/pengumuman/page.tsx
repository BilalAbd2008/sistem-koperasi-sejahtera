"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MemberSidebar from "@/components/MemberSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

interface AnnouncementItem {
  id: number;
  judul: string;
  isi: string;
  tanggal_pengumuman: string;
}

export default function AnggotaPengumumanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

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

    setUser(parsedUser);

    const loadPengumuman = async () => {
      try {
        const res = await fetch("/api/pengumuman?target_role=anggota");
        const data = await res.json();
        if (data.success) {
          setAnnouncements(data.data);
        }
      } catch (error) {
        console.error("Error loading pengumuman:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPengumuman();
  }, [router]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat halaman pengumuman...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <div className="flex h-full">
        <MemberSidebar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Pengumuman (Anggota)
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              Pengumuman Terbaru
            </h1>
            <p className="mt-1 text-slate-600">
              Informasi resmi dari koperasi untuk anggota.
            </p>
          </div>

          <div className="space-y-1 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            {(loading ? [] : announcements).map((item) => {
              const tones = ["amber", "emerald", "sky", "rose"];
              const tone = tones[announcements.indexOf(item) % tones.length];
              return (
                <div
                  key={item.id}
                  className="rounded-2xl px-5 py-4 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                          tone === "amber"
                            ? "bg-amber-100 text-amber-700"
                            : tone === "emerald"
                              ? "bg-emerald-100 text-emerald-700"
                              : tone === "sky"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        •
                      </span>
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">
                          {item.judul}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.isi}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      {new Date(item.tanggal_pengumuman).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
