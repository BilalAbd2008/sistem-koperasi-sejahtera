"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface BendaharaSidebarProps {
  user: {
    nama_lengkap: string;
    role: string;
  };
}

const menu = [
  {
    href: "/dashboard/bendahara",
    label: "Dashboard",
    icon: (
      <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
    ),
  },
  {
    href: "/dashboard/bendahara/anggota",
    label: "Anggota",
    icon: (
      <path d="M10 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0v1H3v-1Z" />
    ),
  },
  {
    href: "/dashboard/bendahara/simpanan",
    label: "Simpanan",
    icon: (
      <path d="M12 2 3 6.5V10c0 5.5 3.3 10 9 12 5.7-2 9-6.5 9-12V6.5L12 2Z" />
    ),
  },
  {
    href: "/dashboard/bendahara/pinjaman",
    label: "Pinjaman",
    icon: (
      <path d="M4 7.5V5.8A2.8 2.8 0 0 1 6.8 3h10.4A2.8 2.8 0 0 1 20 5.8v9.4A2.8 2.8 0 0 1 17.2 18H6.8A2.8 2.8 0 0 1 4 15.2V13h2v2.2c0 .4.4.8.8.8h10.4c.4 0 .8-.4.8-.8V8.4H6.8a.8.8 0 0 1-.8-.8V7.5h-2Z" />
    ),
  },
  {
    href: "/dashboard/bendahara/angsuran",
    label: "Angsuran",
    icon: (
      <path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2Zm13 8H4v10h16V10ZM6 13h5v5H6v-5Z" />
    ),
  },
  {
    href: "/dashboard/bendahara/jurnal",
    label: "Jurnal",
    icon: <path d="M5 3h14v18H5z M7 7h10M7 11h10M7 15h6" />,
  },
  {
    href: "/dashboard/bendahara/buku-besar",
    label: "Buku Besar",
    icon: (
      <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 4h12M8 11h8M8 15h8" />
    ),
  },
  {
    href: "/dashboard/bendahara/laporan",
    label: "Laporan",
    icon: (
      <path d="M2 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5Zm6-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7Zm6-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4Z" />
    ),
  },
  {
    href: "/dashboard/bendahara/pengaturan",
    label: "Pengaturan",
    icon: (
      <path d="M19.4 12.9c.04-.3.06-.6.06-.9s-.02-.6-.06-.9l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.13 7.13 0 0 0-1.56-.9l-.36-2.54A.5.5 0 0 0 14.2 2h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.55.22-1.08.51-1.56.9l-2.39-.96a.5.5 0 0 0-.6.22L3.03 8.44a.5.5 0 0 0 .12.64L5.18 10.66c-.04.3-.06.6-.06.9s.02.6.06.9L3.15 14.04a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.48.39 1.01.68 1.56.9l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.55-.22 1.08-.51 1.56-.9l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64L19.4 12.9ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
    ),
  },
  {
    href: "/dashboard/bendahara/pengumuman",
    label: "Pengumuman",
    icon: (
      <path d="M4 9h4l7-4v14l-7-4H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Zm14.5 3a4.5 4.5 0 0 1-2.5 4v-2.1a2.6 2.6 0 0 0 0-3.8V8a4.5 4.5 0 0 1 2.5 4Z" />
    ),
  },
  {
    href: "/dashboard/bendahara/profil",
    label: "Profil",
    icon: (
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
    ),
  },
];

export default function BendaharaSidebar({ user }: BendaharaSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <aside className="flex h-full w-72 flex-col bg-slate-950 text-white shadow-2xl shadow-slate-950/40">
      <div className="shrink-0 flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            <path d="M12 2 4 6v4c0 5.5 3.3 10 8 12 4.7-2 8-6.5 8-12V6l-8-4Zm0 4.1 5 2.5v2.3c0 3.7-2.1 7-5 8.7-2.9-1.7-5-5-5-8.7V8.6l5-2.5Z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Koperasi
          </p>
          <p className="text-sm font-semibold text-white/90">
            Sejahtera Bersama
          </p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-2">
          {menu.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "text-white/75 hover:bg-white/8 hover:text-white"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {item.icon}
                </svg>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">
            {user.nama_lengkap}
          </p>
          <p className="text-xs text-white/55">{user.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-medium transition hover:bg-red-700"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M16 17v-2h-5v-2h5V9l5 4-5 4ZM4 4h8a2 2 0 0 1 2 2v2h-2V6H4v12h8v-2h2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
