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

interface Announcement {
  id: number;
  title: string;
  date: string;
  description: string;
}

export default function BendaharaPengumumanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState({ title: "", date: "", description: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return void router.push("/");
    if (user.role !== "bendahara") return void router.push("/");
    setUser(user);

    const loadPengumuman = async () => {
      try {
        const res = await fetch("/api/pengumuman?target_role=bendahara");
        const data = await res.json();
        if (data.success) {
          const mapped = data.data.map((item: any) => ({
            id: item.id,
            title: item.judul,
            date: item.tanggal_pengumuman,
            description: item.isi,
          }));
          setAnnouncements(mapped);
        }
      } catch (error) {
        console.error("Error loading pengumuman:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPengumuman();
  }, [router]);

  const handleAdd = () => {
    if (!form.title || !form.date || !form.description) return;

    (async () => {
      try {
        const response = await fetch("/api/pengumuman", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            judul: form.title,
            isi: form.description,
            tanggal_pengumuman: form.date,
            target_role: "bendahara",
          }),
        });

        if (response.ok) {
          setForm({ title: "", date: "", description: "" });
          const res = await fetch("/api/pengumuman?target_role=bendahara");
          const data = await res.json();
          if (data.success) {
            const mapped = data.data.map((item: any) => ({
              id: item.id,
              title: item.judul,
              date: item.tanggal_pengumuman,
              description: item.isi,
            }));
            setAnnouncements(mapped);
          }
        }
      } catch (error) {
        console.error("Error adding pengumuman:", error);
      }
    })();
  };

  const handleDelete = (id: number) => {
    (async () => {
      try {
        const response = await fetch("/api/pengumuman", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });

        if (response.ok) {
          const res = await fetch("/api/pengumuman?target_role=bendahara");
          const data = await res.json();
          if (data.success) {
            const mapped = data.data.map((item: any) => ({
              id: item.id,
              title: item.judul,
              date: item.tanggal_pengumuman,
              description: item.isi,
            }));
            setAnnouncements(mapped);
          }
        }
      } catch (error) {
        console.error("Error deleting pengumuman:", error);
      }
    })();
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat pengumuman...
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Pengumuman</p>
            <h1 className="text-2xl font-bold text-slate-900">
              Kelola Pengumuman
            </h1>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Buat Pengumuman
              </h2>
              <div className="mt-4 space-y-4">
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Judul"
                />
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Isi pengumuman"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
                >
                  Publikasikan
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Daftar Pengumuman
                </h2>
              </div>
              <div className="max-h-115 divide-y divide-slate-100 overflow-y-auto">
                {(loading ? [] : announcements).map((item) => (
                  <div key={item.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {item.description}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(item.date).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                      >
                        Hapus
                      </button>
                    </div>
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
