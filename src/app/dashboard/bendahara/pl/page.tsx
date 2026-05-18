"use client";

import { FinancialReportShell, LabaRugiReport } from "@/components/accounting";

export default function BendaharaWorkingProfitLossPage() {
  return (
    <FinancialReportShell
      eyebrow="BS & PL"
      title="P&L"
      description="Kertas kerja pendapatan, beban, dan SHU berjalan koperasi."
    >
      <LabaRugiReport />
    </FinancialReportShell>
  );
}
