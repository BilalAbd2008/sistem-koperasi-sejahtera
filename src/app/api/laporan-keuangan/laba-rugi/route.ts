import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { getIncomeStatementData } from "@/lib/accounting";

export const dynamic = "force-dynamic";

type IncomeStatementResult = {
  system: string;
  old: unknown | null;
  new: unknown | null;
};

type LegacyIncomeRow = RowDataPacket & {
  akun: string;
  debit: number | string | null;
  kredit: number | string | null;
};

type ModernIncomeRow = RowDataPacket & {
  kodeRekening: string;
  namaRekening: string;
  kategori: "pendapatan" | "beban";
  tipeNormal: "debit" | "kredit";
  totalDebit: number | string | null;
  totalKredit: number | string | null;
};

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
      const result: IncomeStatementResult = {
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

        const [rows] = await connection.query<LegacyIncomeRow[]>(
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
        const oldData = rows.map((row) => ({
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
        if (periode) {
          const isData = await getIncomeStatementData(connection, periode);

          result.new = {
            revenues: isData.revenues,
            expenses: isData.expenses,
            totalRevenues: isData.totalRevenues,
            totalExpenses: isData.totalExpenses,
            netIncome: isData.netIncome,
            periode,
          };
        } else if (periode_awal && periode_akhir) {
          const [rows] = await connection.query<ModernIncomeRow[]>(
            `SELECT
              r.kode_rekening AS kodeRekening,
              r.nama_rekening AS namaRekening,
              r.kategori,
              r.tipe_normal AS tipeNormal,
              COALESCE(SUM(CASE WHEN ju.id IS NOT NULL AND jd.posisi = 'debit' THEN jd.jumlah ELSE 0 END), 0) AS totalDebit,
              COALESCE(SUM(CASE WHEN ju.id IS NOT NULL AND jd.posisi = 'kredit' THEN jd.jumlah ELSE 0 END), 0) AS totalKredit
            FROM rekening r
            LEFT JOIN jurnal_detail jd ON jd.kode_rekening = r.kode_rekening
            LEFT JOIN jurnal_umum ju
              ON ju.id = jd.id_jurnal
              AND ju.status_posting = 'posted'
              AND DATE(ju.tanggal_jurnal) BETWEEN ? AND ?
            WHERE r.status = 'aktif'
              AND r.kategori IN ('pendapatan', 'beban')
            GROUP BY r.kode_rekening, r.nama_rekening, r.kategori, r.tipe_normal
            ORDER BY r.kode_rekening`,
            [periode_awal, periode_akhir],
          );

          const mappedRows = rows.map((row) => {
            const totalDebit = Number(row.totalDebit || 0);
            const totalKredit = Number(row.totalKredit || 0);
            const amount =
              row.tipeNormal === "kredit"
                ? totalKredit - totalDebit
                : totalDebit - totalKredit;

            return {
              kodeRekening: row.kodeRekening,
              namaRekening: row.namaRekening,
              kategori: row.kategori,
              amount: Math.max(amount, 0),
            };
          });

          const revenues = mappedRows.filter((row) => row.kategori === "pendapatan");
          const expenses = mappedRows.filter((row) => row.kategori === "beban");
          const totalRevenues = revenues.reduce((sum, row) => sum + row.amount, 0);
          const totalExpenses = expenses.reduce((sum, row) => sum + row.amount, 0);

          result.new = {
            revenues,
            expenses,
            totalRevenues,
            totalExpenses,
            netIncome: totalRevenues - totalExpenses,
            periode: `${periode_awal} s/d ${periode_akhir}`,
          };
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "Parameter periode atau rentang tanggal diperlukan untuk sistem baru",
            },
            { status: 400 },
          );
        }
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
