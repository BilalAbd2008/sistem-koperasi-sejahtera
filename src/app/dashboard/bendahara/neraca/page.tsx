"use client";

import { FinancialReportShell, NercaReport } from "@/components/accounting";

export default function BendaharaBalanceSheetPage() {
  return (
    <FinancialReportShell
      eyebrow="Laporan Keuangan"
      title="Neraca (Posisi Keuangan)"
      description="Posisi aset, liabilitas, dan ekuitas koperasi per periode."
    >
      <NercaReport />
    </FinancialReportShell>
  );
}
