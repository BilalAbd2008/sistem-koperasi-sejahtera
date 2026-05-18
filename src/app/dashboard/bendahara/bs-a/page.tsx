"use client";

import { BalanceSheetSectionReport, FinancialReportShell } from "@/components/accounting";

export default function BendaharaBalanceSheetAssetPage() {
  return (
    <FinancialReportShell
      eyebrow="BS & PL"
      title="BS - Aset (BS-A)"
      description="Kertas kerja aset koperasi dari jurnal yang sudah diposting."
    >
      <BalanceSheetSectionReport mode="assets" />
    </FinancialReportShell>
  );
}
