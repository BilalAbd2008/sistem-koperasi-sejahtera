"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { logout } from "@/lib/auth";

interface BendaharaSidebarProps {
  user: {
    nama_lengkap: string;
    role: string;
  };
}

const menuSections = [
  {
    title: "Utama",
    items: [
      {
        href: "/dashboard/bendahara",
        label: "Dashboard",
        icon: (
          <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
        ),
      },
    ],
  },
  {
    title: "Simpan Pinjam",
    items: [
      {
        href: "/dashboard/bendahara/anggota",
        label: "Data Nasabah",
        icon: (
          <path d="M10 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0v1H3v-1Zm14-7h2v3h3v2h-3v3h-2v-3h-3v-2h3v-3Z" />
        ),
      },
      {
        href: "/dashboard/bendahara/simpanan",
        label: "Simpanan Nasabah",
        icon: (
          <path d="M12 2 3 6.5V10c0 5.5 3.3 10 9 12 5.7-2 9-6.5 9-12V6.5L12 2Z" />
        ),
      },
      {
        href: "/dashboard/bendahara/pinjaman",
        label: "Pinjaman Nasabah",
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
        href: "/dashboard/bendahara/utang-toko",
        label: "Toko",
        icon: (
          <path d="M4 6h16l-1.4 8.4A2 2 0 0 1 16.6 16H8a2 2 0 0 1-2-1.6L4.8 8H3V6h1Zm4 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
        ),
      },
    ],
  },
  {
    title: "Akuntansi",
    items: [
      {
        href: "/dashboard/bendahara/chart-of-accounts",
        label: "Nama Akun",
        icon: (
          <path d="M4 4h16v4H4V4Zm0 6h16v4H4v-4Zm0 6h16v4H4v-4Z" />
        ),
      },
      {
        href: "/dashboard/bendahara/jurnal",
        label: "Jurnal Umum / GL",
        icon: <path d="M5 3h14v18H5z M7 7h10M7 11h10M7 15h6" />,
      },
      {
        href: "/dashboard/bendahara/buku-besar",
        label: "Buku Besar",
        icon: (
          <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 4h12M8 11h8M8 15h8" />
        ),
      },
    ],
  },
  {
    title: "BS & PL",
    items: [
      {
        href: "/dashboard/bendahara/bs-a",
        label: "BS - Aset (BS-A)",
        icon: <path d="M4 4h16v16H4V4Zm4 5h8M8 13h8M8 17h5" />,
      },
      {
        href: "/dashboard/bendahara/bs-l",
        label: "BS - Liab & Ekuitas (BS-L)",
        icon: <path d="M4 4h16v16H4V4Zm4 5h8M8 13h8M8 17h5" />,
      },
      {
        href: "/dashboard/bendahara/pl",
        label: "P&L",
        icon: <path d="M4 19h16v2H4v-2Zm2-2 4-5 3 3 5-8 2 1-6.7 10.7-3-3L7.5 18 6 17Z" />,
      },
    ],
  },
  {
    title: "Laporan Keuangan",
    items: [
      {
        href: "/dashboard/bendahara/trial-balance",
        label: "Neraca Saldo (TB)",
        icon: (
          <path d="M11 4h2v3h6v2h-2.1l3.1 6.2A4 4 0 0 1 12 15.2L15.1 9H13v10h4v2H7v-2h4V9H8.9l3.1 6.2A4 4 0 0 1 4 15.2L7.1 9H5V7h6V4Zm-4 7.2-1.8 3.6h3.6L7 11.2Zm10 0-1.8 3.6h3.6L17 11.2Z" />
        ),
      },
      {
        href: "/dashboard/bendahara/laba-rugi",
        label: "Laba Rugi (P&L)",
        icon: (
          <path d="M4 17.5 9.5 12l3 3L20 6.5 18.5 5 12.5 12l-3-3L3 15.5l1 2Z" />
        ),
      },
      {
        href: "/dashboard/bendahara/neraca",
        label: "Neraca (Posisi Keuangan)",
        icon: (
          <path d="M3 21h18v-2H3v2ZM5 10h3v7H5v-7Zm5-4h4v11h-4V6Zm6 7h3v4h-3v-4ZM4 4h16v2H4V4Z" />
        ),
      },
      {
        href: "/dashboard/bendahara/shu",
        label: "SHU",
        icon: (
          <path d="M12 2 4 6v6c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10V6l-8-4Zm-1 5h2v2h2v2h-2v5h-2v-5H9V9h2V7Z" />
        ),
      },
    ],
  },
  {
    title: "Sistem",
    items: [
      {
        href: "/dashboard/bendahara/profil",
        label: "Profil",
        icon: (
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
        ),
      },
    ],
  },
];

const ketuaKoperasiMenuSections = [
  {
    title: "Laporan Keuangan",
    items: [
      {
        href: "/dashboard/bendahara/laporan",
        label: "Laporan Keuangan",
        icon: (
          <path d="M4 4h16v16H4V4Zm4 5h8M8 13h8M8 17h5" />
        ),
      },
      {
        href: "/dashboard/bendahara/trial-balance",
        label: "Neraca Saldo (TB)",
        icon: (
          <path d="M11 4h2v3h6v2h-2.1l3.1 6.2A4 4 0 0 1 12 15.2L15.1 9H13v10h4v2H7v-2h4V9H8.9l3.1 6.2A4 4 0 0 1 4 15.2L7.1 9H5V7h6V4Zm-4 7.2-1.8 3.6h3.6L7 11.2Zm10 0-1.8 3.6h3.6L17 11.2Z" />
        ),
      },
      {
        href: "/dashboard/bendahara/laba-rugi",
        label: "Laba Rugi (P&L)",
        icon: (
          <path d="M4 17.5 9.5 12l3 3L20 6.5 18.5 5 12.5 12l-3-3L3 15.5l1 2Z" />
        ),
      },
      {
        href: "/dashboard/bendahara/neraca",
        label: "Neraca (Posisi Keuangan)",
        icon: (
          <path d="M3 21h18v-2H3v2ZM5 10h3v7H5v-7Zm5-4h4v11h-4V6Zm6 7h3v4h-3v-4ZM4 4h16v2H4V4Z" />
        ),
      },
    ],
  },
  {
    title: "Sistem",
    items: [
      {
        href: "/dashboard/bendahara/profil",
        label: "Profil",
        icon: (
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
        ),
      },
    ],
  },
  {
    title: "Sistem",
    items: [
      {
        href: "/dashboard/bendahara/profil",
        label: "Profil",
        icon: (
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
        ),
      },
    ],
  },
];

export default function BendaharaSidebar({ user }: BendaharaSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement | null>(null);
  const sections =
    user.role === "ketua_koperasi" ? ketuaKoperasiMenuSections : menuSections;

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const saved = sessionStorage.getItem("bendahara-sidebar-scroll");
    if (saved) {
      nav.scrollTop = Number(saved);
    }

    const saveScroll = () => {
      sessionStorage.setItem("bendahara-sidebar-scroll", String(nav.scrollTop));
    };

    nav.addEventListener("scroll", saveScroll, { passive: true });
    return () => nav.removeEventListener("scroll", saveScroll);
  }, []);

  const handleLogout = () => {
    logout(user.role);
    router.push("/");
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 flex h-dvh w-72 flex-col overflow-hidden bg-slate-950 text-white shadow-2xl shadow-slate-950/40">
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5">
            <Image src="/koperasi-logo.jpg" alt="Logo Koperasi" width={34} height={34} className="h-full w-full object-contain" />
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

        <nav ref={navRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.title}>
                <p className="mb-2 px-4 text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        scroll={false}
                        className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                          active
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                            : "text-white/75 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5 shrink-0"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          {item.icon}
                        </svg>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
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
      <div className="w-72 shrink-0" aria-hidden="true" />
    </>
  );
}
