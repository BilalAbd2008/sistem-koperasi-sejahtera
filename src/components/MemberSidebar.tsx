"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { logout, getAllUsers, switchRole } from "@/lib/auth";

interface MemberSidebarProps {
  user: {
    nama_lengkap: string;
    role: string;
  };
}

const menu = [
  {
    href: "/dashboard/anggota",
    label: "Dashboard",
    icon: (
      <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
    ),
  },
  {
    href: "/dashboard/anggota/simpanan",
    label: "Simpanan",
    icon: (
      <path d="M12 2 3 6.5V10c0 5.5 3.3 10 9 12 5.7-2 9-6.5 9-12V6.5L12 2Zm1 13.2V17h-2v-1.9a2.7 2.7 0 0 1-2-2.6h2a1 1 0 0 0 2 0c0-.7-.4-1-1.3-1.4l-.5-.2c-1.8-.5-2.7-1.7-2.7-3.1 0-1.6 1-2.8 2.5-3.1V4h2v1.4c1.3.4 2.2 1.4 2.4 2.8h-2c-.2-.6-.6-1-1.2-1.2-.8.2-1.3.7-1.3 1.4 0 .6.4 1 1.4 1.3l.6.2c1.7.5 2.8 1.7 2.8 3.3 0 1.6-1 2.8-2.6 3.3Z" />
    ),
  },
  {
    href: "/dashboard/anggota/pinjaman",
    label: "Pinjaman",
    icon: (
      <path d="M4 7.5V5.8A2.8 2.8 0 0 1 6.8 3h10.4A2.8 2.8 0 0 1 20 5.8v9.4A2.8 2.8 0 0 1 17.2 18H6.8A2.8 2.8 0 0 1 4 15.2V13h2v2.2c0 .4.4.8.8.8h10.4c.4 0 .8-.4.8-.8V8.4H6.8a.8.8 0 0 1-.8-.8V7.5h-2Zm4.5 8.5h4a1 1 0 0 0 0-2h-4a1 1 0 0 0 0 2Zm0-4h5a1 1 0 0 0 0-2h-5a1 1 0 0 0 0 2Z" />
    ),
  },
  {
    href: "/dashboard/anggota/angsuran",
    label: "Angsuran",
    icon: (
      <path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2Zm13 8H4v10h16V10ZM6 13h5v5H6v-5Z" />
    ),
  },
  {
    href: "/dashboard/anggota/pengumuman",
    label: "Pengumuman",
    icon: (
      <path d="M4 9h4l7-4v14l-7-4H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Zm14.5 3a4.5 4.5 0 0 1-2.5 4v-2.1a2.6 2.6 0 0 0 0-3.8V8a4.5 4.5 0 0 1 2.5 4Zm-3.8-7.1a1 1 0 1 1 1.4-1.4 7.5 7.5 0 0 1 0 10.6 1 1 0 1 1-1.4-1.4 5.5 5.5 0 0 0 0-7.8Z" />
    ),
  },
  {
    href: "/dashboard/anggota/profil",
    label: "Profil",
    icon: (
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
    ),
  },
];

export default function MemberSidebar({ user }: MemberSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout("anggota");
    router.push("/");
  };

  const handleSwitchRole = () => {
    const users = getAllUsers();
    const otherRole = users.find((u) => u.role !== "anggota")?.role;
    if (otherRole && switchRole(otherRole)) {
      const dashboardPath =
        otherRole === "bendahara" ? "/dashboard/bendahara" : "/dashboard";
      router.push(dashboardPath);
    }
  };

  const hasOtherUsers = getAllUsers().length > 1;

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col bg-slate-950 text-white shadow-2xl shadow-slate-950/40">
      <div className="shrink-0 flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5">
          <Image src="/koperasi-logo.svg" alt="Logo Koperasi" width={34} height={34} className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Koperasi
          </p>
          <p className="text-sm font-semibold text-white/90">
            PRI BDAPK Cinagara
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
        {hasOtherUsers && (
          <button
            onClick={handleSwitchRole}
            className="mt-3 flex w-full items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium transition hover:bg-emerald-700"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
            </svg>
            Ganti Role
          </button>
        )}
        <button
          onClick={handleLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-medium transition hover:bg-red-700"
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
