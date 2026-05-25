import { NextRequest, NextResponse } from "next/server";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { getBalanceSheetData } from "@/lib/accounting";

export const dynamic = "force-dynamic";

type BalanceSheetResult = {
  system: string;
  old: unknown | null;
  new: unknown | null;
};

type LegacyBalanceRow = RowDataPacket & {
  akun: string;
  debit: number | string | null;
  kredit: number | string | null;
};

type ModernBalanceRow = RowDataPacket & {
  kodeRekening: string;
  namaRekening: string;
  kategori: "aset" | "liabilitas" | "modal";
  tipeNormal: "debit" | "kredit";
  totalDebit: number | string | null;
  totalKredit: number | string | null;
};

type NetIncomeRow = RowDataPacket & {
  netIncome: number | string | null;
};

type BalanceReportItem = {
  kodeRekening: string;
  namaRekening: string;
  kategori: "aset" | "liabilitas" | "modal";
  saldo: number;
};

async function calculateNetIncome(
  connection: PoolConnection,
  startDate: string,
  endDate: string,
) {
  const [rows] = await connection.query<NetIncomeRow[]>(
    `SELECT
      COALESCE(SUM(
        CASE
          WHEN r.kategori = 'pendapatan' AND r.tipe_normal = 'kredit'
            THEN CASE WHEN jd.posisi = 'kredit' THEN jd.jumlah ELSE -jd.jumlah END
          WHEN r.kategori = 'pendapatan'
            THEN CASE WHEN jd.posisi = 'debit' THEN jd.jumlah ELSE -jd.jumlah END
          WHEN r.kategori = 'beban' AND r.tipe_normal = 'debit'
            THEN -1 * CASE WHEN jd.posisi = 'debit' THEN jd.jumlah ELSE -jd.jumlah END
          WHEN r.kategori = 'beban'
            THEN -1 * CASE WHEN jd.posisi = 'kredit' THEN jd.jumlah ELSE -jd.jumlah END
          ELSE 0
        END
      ), 0) AS netIncome
    FROM jurnal_detail jd
    JOIN jurnal_umum ju
      ON ju.id = jd.id_jurnal
      AND ju.status_posting = 'posted'
      AND DATE(ju.tanggal_jurnal) BETWEEN ? AND ?
    JOIN rekening r ON r.kode_rekening = jd.kode_rekening
    WHERE r.status = 'aktif'
      AND r.kategori IN ('pendapatan', 'beban')`,
    [startDate, endDate],
  );

  return Number(rows[0]?.netIncome || 0);
}

function includeCurrentIncomeInEquity(
  equity: BalanceReportItem[],
  netIncome: number,
) {
  let found = false;
  const updated = equity.map((row) => {
    if (row.kodeRekening !== "3-3000") return row;
    found = true;
    return {
      ...row,
      saldo: Number(row.saldo || 0) + netIncome,
    };
  });

  if (!found && Math.abs(netIncome) > 0.01) {
    updated.push({
      kodeRekening: "3-3000",
      namaRekening: "Laba/Rugi Tahun Berjalan",
      kategori: "modal",
      saldo: netIncome,
    });
  }

  return updated;
}

/**
 * GET /api/laporan-keuangan/neraca
 * Balance Sheet Report (Neraca Posisi Keuangan)
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
      const result: BalanceSheetResult = {
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

        const [rows] = await connection.query<LegacyBalanceRow[]>(
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

        // Map old system data to balance sheet
        const oldData = rows.map((row) => ({
          akun: row.akun,
          debit: Number(row.debit || 0),
          kredit: Number(row.kredit || 0),
          saldo: Number(row.debit || 0) - Number(row.kredit || 0),
        }));

        const assets = oldData
          .filter((row) =>
            [
              "Kas",
              "Piutang Pinjaman",
              "Piutang Bunga",
              "Peralatan Kantor",
            ].includes(row.akun),
          )
          .map((row) => ({
            kodeRekening: row.akun,
            namaRekening: row.akun,
            kategori: "aset",
            saldo: row.saldo,
          }));
        const liabilities = oldData
          .filter((row) =>
            [
              "Simpanan Wajib",
              "Simpanan Pokok",
              "Simpanan Sukarela",
              "Simpanan Lebaran",
              "Simpanan Pendidikan",
            ].includes(row.akun),
          )
          .map((row) => ({
            kodeRekening: row.akun,
            namaRekening: row.akun,
            kategori: "liabilitas",
            saldo: Math.abs(row.saldo),
          }));

        const totalAssets = assets.reduce((sum, r) => sum + r.saldo, 0);
        const totalLiabilities = liabilities.reduce(
          (sum, r) => sum + r.saldo,
          0,
        );
        const totalEquity = totalAssets - totalLiabilities;

        result.old = {
          assets,
          liabilities,
          equity: [
            {
              kodeRekening: "SHU",
              namaRekening: "Ekuitas / SHU Berjalan",
              kategori: "modal",
              saldo: totalEquity,
            },
          ],
          totalAssets,
          totalLiabilities,
          totalEquity,
          periode: periode || `${periode_awal || "awal"} s/d ${periode_akhir || "akhir"}`,
        };
      }

      // Fetch from new system (jurnal_umum + rekening)
      if (system === "new" || system === "all") {
        if (periode) {
          const startDate = periode_awal || `${periode}-01`;
          const endDate = periode_akhir || startDate;
          const bsData = await getBalanceSheetData(connection, periode);
          const netIncome = await calculateNetIncome(connection, startDate, endDate);
          const equity = includeCurrentIncomeInEquity(bsData.equity, netIncome);
          const totalEquity = equity.reduce((sum, row) => sum + row.saldo, 0);

          result.new = {
            assets: bsData.assets,
            liabilities: bsData.liabilities,
            equity,
            totalAssets: bsData.totalAssets,
            totalLiabilities: bsData.totalLiabilities,
            totalEquity,
            periode,
          };
        } else if (periode_awal && periode_akhir) {
          const [rows] = await connection.query<ModernBalanceRow[]>(
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
              AND r.kategori IN ('aset', 'liabilitas', 'modal')
            GROUP BY r.kode_rekening, r.nama_rekening, r.kategori, r.tipe_normal
            ORDER BY r.kode_rekening`,
            [periode_awal, periode_akhir],
          );

          const mappedRows = rows.map((row) => {
            const totalDebit = Number(row.totalDebit || 0);
            const totalKredit = Number(row.totalKredit || 0);
            const saldo =
              row.tipeNormal === "kredit"
                ? totalKredit - totalDebit
                : totalDebit - totalKredit;

            return {
              kodeRekening: row.kodeRekening,
              namaRekening: row.namaRekening,
              kategori: row.kategori,
              saldo: Math.max(saldo, 0),
            };
          });

          const assets = mappedRows.filter((row) => row.kategori === "aset");
          const liabilities = mappedRows.filter((row) => row.kategori === "liabilitas");
          const netIncome = await calculateNetIncome(connection, periode_awal, periode_akhir);
          const equity = includeCurrentIncomeInEquity(
            mappedRows.filter((row) => row.kategori === "modal"),
            netIncome,
          );
          const totalAssets = assets.reduce((sum, row) => sum + row.saldo, 0);
          const totalLiabilities = liabilities.reduce((sum, row) => sum + row.saldo, 0);
          const totalEquity = equity.reduce((sum, row) => sum + row.saldo, 0);

          result.new = {
            assets,
            liabilities,
            equity,
            totalAssets,
            totalLiabilities,
            totalEquity,
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
    console.error("GET /api/laporan-keuangan/neraca error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
