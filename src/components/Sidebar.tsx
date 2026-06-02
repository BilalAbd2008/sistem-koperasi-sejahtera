'use client';

import Link from 'next/link';
import { useState } from 'react';

interface SidebarProps {
  user: any;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside
      className={`bg-gray-900 text-white transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="p-4 flex items-center justify-between">
        {isOpen && (
          <div>
            <h2 className="text-xl font-bold">PRI BDAPK</h2>
            <p className="text-xs text-gray-400">Koperasi Cinagara</p>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-800 rounded"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <nav className="mt-8 space-y-2 px-4">
        <Link href="/dashboard">
          <div className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 transition cursor-pointer">
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
            </svg>
            {isOpen && <span>Dashboard</span>}
          </div>
        </Link>

        <Link href="/anggota">
          <div className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 transition cursor-pointer">
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            {isOpen && <span>Anggota</span>}
          </div>
        </Link>

        <Link href="/simpanan">
          <div className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 transition cursor-pointer">
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            {isOpen && <span>Simpanan</span>}
          </div>
        </Link>

        <Link href="/pinjaman">
          <div className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 transition cursor-pointer">
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8.16 2.75a1 1 0 00-.32 1.67c.5.35.88.97.88 1.58 0 1.11-.89 2-2 2-1.11 0-2-.89-2-2 0-1.11.89-2 2-2 .61 0 1.23.38 1.58.88.5.5 1.17.5 1.67 0s.5-1.17 0-1.67A4 4 0 004.75 1h10.5a1 1 0 010 2H4.75z" />
            </svg>
            {isOpen && <span>Pinjaman</span>}
          </div>
        </Link>

        <Link href="/laporan-keuangan">
          <div className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 transition cursor-pointer">
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            {isOpen && <span>Laporan</span>}
          </div>
        </Link>
      </nav>

      {/* User Profile and Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        {isOpen && (
          <div className="mb-4">
            <p className="text-sm font-semibold">{user.nama_lengkap}</p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.707 4.707a1 1 0 01-1.414-1.414L12.586 6H10a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V7.414z"
              clipRule="evenodd"
            />
          </svg>
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
