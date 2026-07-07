"use client";

import { FinancialReportShell, TrialBalanceReport } from "@/components/accounting";

const reportViewerRoles = ["bendahara", "ketua_koperasi"];

export default function BendaharaTrialBalancePage() {
  return (
    <FinancialReportShell
      eyebrow="Laporan Keuangan"
      title="Neraca Saldo (TB)"
      description="Trial balance untuk memeriksa keseimbangan debit dan kredit."
      allowedRoles={reportViewerRoles}
    >
      <TrialBalanceReport />
    </FinancialReportShell>
  );
}
