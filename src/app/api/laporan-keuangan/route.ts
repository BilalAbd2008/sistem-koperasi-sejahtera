import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

type TrialBalanceRow = {
  akun: string;
  debit: number | string | null;
  kredit: number | string | null;
};

const assetAccounts = new Set(["Kas", "Piutang Pinjaman", "Piutang Bunga"]);
const liabilityAccounts = new Set([
  "Simpanan Pokok",
  "Simpanan Wajib",
  "Simpanan Sukarela",
]);
const revenueAccounts = new Set(["Pendapatan Bunga"]);

function toNumber(value: number | string | null | undefined) {
  return Number(value || 0);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periode_awal = searchParams.get("periode_awal");
    const periode_akhir = searchParams.get("periode_akhir");
    const tipe = searchParams.get("tipe") || "ringkasan";

    const connection = await pool.getConnection();

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

    const [trialRows] = await connection.query(
      `
        SELECT
          jenis_transaksi AS akun,
          SUM(CASE WHEN tipe = 'debit' THEN jumlah ELSE 0 END) AS debit,
          SUM(CASE WHEN tipe = 'kredit' THEN jumlah ELSE 0 END) AS kredit
        FROM transaksi_lain
        ${whereClause}
        GROUP BY jenis_transaksi
        ORDER BY jenis_transaksi
      `,
      params,
    );

    const trialBalance = (trialRows as TrialBalanceRow[]).map((row) => ({
      akun: row.akun,
      debit: toNumber(row.debit),
      kredit: toNumber(row.kredit),
      saldo: toNumber(row.debit) - toNumber(row.kredit),
    }));

    const assets = trialBalance
      .filter((row) => assetAccounts.has(row.akun))
      .map((row) => ({ ...row, saldo: row.saldo }));
    const liabilities = trialBalance
      .filter((row) => liabilityAccounts.has(row.akun))
      .map((row) => ({ ...row, saldo: Math.abs(row.saldo) }));
    const revenues = trialBalance
      .filter((row) => revenueAccounts.has(row.akun))
      .map((row) => ({ ...row, saldo: Math.abs(row.saldo) }));
    const expenses = trialBalance
      .filter(
        (row) =>
          !assetAccounts.has(row.akun) &&
          !liabilityAccounts.has(row.akun) &&
          !revenueAccounts.has(row.akun),
      )
      .filter((row) => row.saldo > 0);

    const totalAssets = assets.reduce((sum, row) => sum + row.saldo, 0);
    const totalLiabilities = liabilities.reduce(
      (sum, row) => sum + row.saldo,
      0,
    );
    const totalRevenue = revenues.reduce((sum, row) => sum + row.saldo, 0);
    const totalExpenses = expenses.reduce((sum, row) => sum + row.saldo, 0);
    const netIncome = totalRevenue - totalExpenses;

    const [savedReports] = await connection.query(
      "SELECT * FROM laporan_keuangan ORDER BY periode_akhir DESC",
    );
    connection.release();

    return NextResponse.json({
      success: true,
      tipe,
      data: savedReports,
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity: totalAssets - totalLiabilities,
        totalRevenue,
        totalExpenses,
        netIncome,
        totalDebit: trialBalance.reduce((sum, row) => sum + row.debit, 0),
        totalKredit: trialBalance.reduce((sum, row) => sum + row.kredit, 0),
      },
      reports: {
        trialBalance,
        bsAssets: assets,
        bsLiabilitiesEquity: [
          ...liabilities,
          {
            akun: "Ekuitas / SHU Berjalan",
            debit: 0,
            kredit: netIncome,
            saldo: totalAssets - totalLiabilities,
          },
        ],
        profitLoss: [...revenues, ...expenses],
        balanceSheet: {
          assets,
          liabilities,
          equity: totalAssets - totalLiabilities,
        },
      },
    });
  } catch (error) {
    console.error("Get laporan error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      periode_awal,
      periode_akhir,
      total_simpanan,
      total_pinjaman,
      total_bunga_pinjaman,
      total_biaya,
      keterangan,
    } = await request.json();

    const total_laba_rugi = (total_bunga_pinjaman || 0) - (total_biaya || 0);

    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO laporan_keuangan 
       (periode_awal, periode_akhir, total_simpanan, total_pinjaman, total_bunga_pinjaman, total_biaya, total_laba_rugi, keterangan) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        periode_awal,
        periode_akhir,
        total_simpanan,
        total_pinjaman,
        total_bunga_pinjaman,
        total_biaya,
        total_laba_rugi,
        keterangan,
      ],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Laporan keuangan berhasil dibuat",
    });
  } catch (error) {
    console.error("Create laporan error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      periode_awal,
      periode_akhir,
      total_simpanan,
      total_pinjaman,
      total_bunga_pinjaman,
      total_biaya,
      keterangan,
    } = await request.json();

    const total_laba_rugi = (total_bunga_pinjaman || 0) - (total_biaya || 0);

    const connection = await pool.getConnection();
    await connection.query(
      `UPDATE laporan_keuangan SET periode_awal = ?, periode_akhir = ?, total_simpanan = ?, total_pinjaman = ?, total_bunga_pinjaman = ?, total_biaya = ?, total_laba_rugi = ?, keterangan = ? WHERE id = ?`,
      [
        periode_awal,
        periode_akhir,
        total_simpanan,
        total_pinjaman,
        total_bunga_pinjaman,
        total_biaya,
        total_laba_rugi,
        keterangan,
        id,
      ],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Laporan keuangan berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update laporan error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    const connection = await pool.getConnection();
    await connection.query("DELETE FROM laporan_keuangan WHERE id = ?", [id]);
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Laporan keuangan berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete laporan error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
