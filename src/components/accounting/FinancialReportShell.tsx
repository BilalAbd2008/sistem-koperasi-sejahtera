"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import BendaharaSidebar from "@/components/BendaharaSidebar";
import { getCurrentUser } from "@/lib/auth";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

const DEFAULT_ALLOWED_ROLES = ["bendahara"];

export default function FinancialReportShell({
  eyebrow,
  title,
  description,
  allowedRoles = DEFAULT_ALLOWED_ROLES,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  allowedRoles?: string[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const allowedRolesKey = allowedRoles.join("|");

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) return void router.push("/");
    const roles = allowedRolesKey.split("|");
    if (!roles.includes(currentUser.role)) {
      return void router.push("/");
    }

    setUser(currentUser);
    setLoading(false);
  }, [allowedRolesKey, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat laporan...
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex min-h-screen">
        <BendaharaSidebar user={user} />
        <main className="min-w-0 flex-1 bg-slate-50 p-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">{eyebrow}</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">{title}</h1>
              {description ? (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              ) : null}
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
