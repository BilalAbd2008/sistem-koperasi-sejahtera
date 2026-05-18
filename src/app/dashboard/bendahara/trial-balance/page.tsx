"use client";

import { FinancialReportShell, TrialBalanceReport } from "@/components/accounting";

export default function BendaharaTrialBalancePage() {
  return (
    <FinancialReportShell
      eyebrow="Laporan Keuangan"
      title="Neraca Saldo (TB)"
      description="Trial balance untuk memeriksa keseimbangan debit dan kredit."
    >
      <TrialBalanceReport />
    </FinancialReportShell>
  );
}
