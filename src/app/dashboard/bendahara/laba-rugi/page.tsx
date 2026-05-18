"use client";

import { FinancialReportShell, LabaRugiReport } from "@/components/accounting";

export default function BendaharaIncomeStatementPage() {
  return (
    <FinancialReportShell
      eyebrow="Laporan Keuangan"
      title="Laba Rugi (P&L)"
      description="Laporan pendapatan, beban, dan hasil usaha koperasi."
    >
      <LabaRugiReport />
    </FinancialReportShell>
  );
}
