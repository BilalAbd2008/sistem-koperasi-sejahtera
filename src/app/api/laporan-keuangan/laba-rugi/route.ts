import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getIncomeStatementData } from "@/lib/accounting";

export const dynamic = "force-dynamic";

/**
 * GET /api/laporan-keuangan/laba-rugi
 * Income Statement Report (Laporan Laba Rugi)
 *
 * Query params:
 *   - periode: YYYY-MM (for new system, required)
 *   - periode_awal: YYYY-MM-DD (for old system)
 *   - periode_akhir: YYYY-MM-DD (for old system)
 *   - system: 'old' | 'new' | 'all' (default)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periode = searchParams.get("periode");
    let periode_awal = searchParams.get("periode_awal");
    let periode_akhir = searchParams.get("periode_akhir");
    const system = searchParams.get("system") || "all";

    if (periode && (!periode_awal || !periode_akhir)) {
      const [yearValue, monthValue] = periode.split("-").map(Number);
      periode_awal = `${periode}-01`;
      periode_akhir = new Date(yearValue, monthValue, 0).toISOString().slice(0, 10);
    }

    const connection = await pool.getConnection();

    try {
      let result: any = {
        system,
        old: null,
        new: null,
      };

      // Fetch from old system (transaksi_lain)
      if (system === "old" || system === "all") {
        const params: unknown[] = [];
        const conditions: string[] = [];

        if (periode_awal) {
          conditions.push("tanggal_transaksi >= ?");
          params.push(periode_awal);
        }
        if (periode_akhir) {
          conditions.push("tanggal_transaksi <= ?");
          params.push(periode_akhir);
        }

        const whereClause = conditions.length
          ? `WHERE ${conditions.join(" AND ")}`
          : "";

        const [rows] = await connection.query(
          `SELECT
            jenis_transaksi AS akun,
            SUM(CASE WHEN tipe = 'debit' THEN jumlah ELSE 0 END) AS debit,
            SUM(CASE WHEN tipe = 'kredit' THEN jumlah ELSE 0 END) AS kredit
          FROM transaksi_lain
          ${whereClause}
          GROUP BY jenis_transaksi
          ORDER BY jenis_transaksi`,
          params,
        );

        // Map old system data to income statement
        const oldData = (rows as any[]).map((row) => ({
          akun: row.akun,
          debit: Number(row.debit || 0),
          kredit: Number(row.kredit || 0),
          saldo: Number(row.debit || 0) - Number(row.kredit || 0),
        }));

        const revenues = oldData
          .filter((row) =>
            ["Pendapatan Bunga", "Pendapatan Lain-lain"].includes(row.akun),
          )
          .map((row) => ({
            kodeRekening: row.akun,
            namaRekening: row.akun,
            amount: Math.abs(row.saldo),
          }));
        const expenses = oldData
          .filter((row) =>
            [
              "Gaji & Honorarium",
              "Biaya Administrasi",
              "Biaya Pemeliharaan",
            ].includes(row.akun),
          )
          .map((row) => ({
            kodeRekening: row.akun,
            namaRekening: row.akun,
            amount: Math.abs(row.saldo),
          }));

        const totalRevenues = revenues.reduce(
          (sum, r) => sum + r.amount,
          0,
        );
        const totalExpenses = expenses.reduce(
          (sum, r) => sum + r.amount,
          0,
        );
        const netIncome = totalRevenues - totalExpenses;

        result.old = {
          revenues,
          expenses,
          totalRevenues,
          totalExpenses,
          netIncome,
          periode: periode || `${periode_awal || "awal"} s/d ${periode_akhir || "akhir"}`,
        };
      }

      // Fetch from new system (jurnal_umum + rekening)
      if (system === "new" || system === "all") {
        if (!periode) {
          return NextResponse.json(
            {
              success: false,
              error: "Parameter 'periode' (YYYY-MM) diperlukan untuk sistem baru",
            },
            { status: 400 },
          );
        }

        const isData = await getIncomeStatementData(connection, periode);

        result.new = {
          revenues: isData.revenues,
          expenses: isData.expenses,
          totalRevenues: isData.totalRevenues,
          totalExpenses: isData.totalExpenses,
          netIncome: isData.netIncome,
          periode,
        };
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("GET /api/laporan-keuangan/laba-rugi error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
