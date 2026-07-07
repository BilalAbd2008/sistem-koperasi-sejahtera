"use client";

import { FinancialReportShell, NercaReport } from "@/components/accounting";

const reportViewerRoles = ["bendahara", "ketua_koperasi"];

export default function BendaharaBalanceSheetPage() {
  return (
    <FinancialReportShell
      eyebrow="Laporan Keuangan"
      title="Neraca (Posisi Keuangan)"
      description="Posisi aset, liabilitas, dan ekuitas koperasi per periode."
      allowedRoles={reportViewerRoles}
    >
      <NercaReport />
    </FinancialReportShell>
  );
}
