"use client";

import { BalanceSheetSectionReport, FinancialReportShell } from "@/components/accounting";

export default function BendaharaBalanceSheetLiabilityPage() {
  return (
    <FinancialReportShell
      eyebrow="BS & PL"
      title="BS - Liab & Ekuitas (BS-L)"
      description="Kertas kerja liabilitas anggota dan ekuitas koperasi."
    >
      <BalanceSheetSectionReport mode="liabilities" />
    </FinancialReportShell>
  );
}
