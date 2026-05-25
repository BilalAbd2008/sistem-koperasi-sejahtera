import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

type TotalRow = RowDataPacket & {
  total: number | string | null;
};

type SavingsSummaryRow = RowDataPacket & {
  wajibCount: number | string | null;
  wajibTotal: number | string | null;
  pokokCount: number | string | null;
  pokokTotal: number | string | null;
  lebaranCount: number | string | null;
  lebaranTotal: number | string | null;
  pendidikanCount: number | string | null;
  pendidikanTotal: number | string | null;
  sukarelaCount: number | string | null;
  sukarelaTotal: number | string | null;
};

type AccountingBalanceRow = RowDataPacket & {
  kategori: "aset" | "liabilitas" | "modal";
  tipeNormal: "debit" | "kredit";
  totalDebit: number | string | null;
  totalKredit: number | string | null;
};

type IncomeRow = RowDataPacket & {
  kategori: "pendapatan" | "beban";
  tipeNormal: "debit" | "kredit";
  totalDebit: number | string | null;
  totalKredit: number | string | null;
};

const toNumber = (value: number | string | null | undefined) =>
  Number(value || 0);

const normalBalance = (
  row: { tipeNormal: "debit" | "kredit"; totalDebit: number | string | null; totalKredit: number | string | null },
) => {
  const totalDebit = toNumber(row.totalDebit);
  const totalKredit = toNumber(row.totalKredit);
  return row.tipeNormal === "kredit"
    ? totalKredit - totalDebit
    : totalDebit - totalKredit;
};

export async function GET() {
  try {
    const connection = await pool.getConnection();

    const [totalAnggota] = await connection.query<TotalRow[]>(
      'SELECT COUNT(*) AS total FROM anggota WHERE status = "aktif"',
    );
    const [totalSimpanan] = await connection.query<TotalRow[]>(
      'SELECT COALESCE(SUM(jumlah), 0) AS total FROM simpanan WHERE status = "aktif"',
    );
    const [savingSummary] = await connection.query<SavingsSummaryRow[]>(
      `SELECT
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'wajib' THEN 1 ELSE 0 END), 0) AS wajibCount,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'wajib' THEN jumlah ELSE 0 END), 0) AS wajibTotal,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'pokok' THEN 1 ELSE 0 END), 0) AS pokokCount,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'pokok' THEN jumlah ELSE 0 END), 0) AS pokokTotal,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'lebaran' THEN 1 ELSE 0 END), 0) AS lebaranCount,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'lebaran' THEN jumlah ELSE 0 END), 0) AS lebaranTotal,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'pendidikan' THEN 1 ELSE 0 END), 0) AS pendidikanCount,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'pendidikan' THEN jumlah ELSE 0 END), 0) AS pendidikanTotal,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'sukarela' THEN 1 ELSE 0 END), 0) AS sukarelaCount,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'sukarela' THEN jumlah ELSE 0 END), 0) AS sukarelaTotal
       FROM simpanan
       WHERE status = "aktif"`,
    );
    const [totalPinjaman] = await connection.query<TotalRow[]>(
      'SELECT COALESCE(SUM(jumlah_pinjam), 0) AS total FROM pinjaman WHERE status = "aktif"',
    );
    const [pinjamanCount] = await connection.query<TotalRow[]>(
      'SELECT COUNT(*) AS total FROM pinjaman WHERE status = "aktif"',
    );
    const [totalBunga] = await connection.query<TotalRow[]>(
      'SELECT COALESCE(SUM(jumlah_bunga), 0) AS total FROM pinjaman WHERE status IN ("aktif", "lunas")',
    );
    const [saldoKas] = await connection.query<TotalRow[]>(
      'SELECT COALESCE(SUM(CASE WHEN tipe = "kredit" THEN jumlah ELSE -jumlah END), 0) AS total FROM transaksi_lain',
    );
    const [recentLoans] = await connection.query(
      `SELECT p.id, a.nama, p.jumlah_pinjam, p.tanggal_pinjam, p.status
       FROM pinjaman p
       JOIN anggota a ON p.id_anggota = a.id
       ORDER BY p.tanggal_pinjam DESC
       LIMIT 3`,
    );
    const [balanceRows] = await connection.query<AccountingBalanceRow[]>(
      `SELECT
        r.kategori,
        r.tipe_normal AS tipeNormal,
        COALESCE(SUM(CASE WHEN ju.id IS NOT NULL AND jd.posisi = 'debit' THEN jd.jumlah ELSE 0 END), 0) AS totalDebit,
        COALESCE(SUM(CASE WHEN ju.id IS NOT NULL AND jd.posisi = 'kredit' THEN jd.jumlah ELSE 0 END), 0) AS totalKredit
       FROM rekening r
       LEFT JOIN jurnal_detail jd ON jd.kode_rekening = r.kode_rekening
       LEFT JOIN jurnal_umum ju
        ON ju.id = jd.id_jurnal
        AND ju.status_posting = 'posted'
       WHERE r.status = 'aktif'
        AND r.kategori IN ('aset', 'liabilitas', 'modal')
       GROUP BY r.kode_rekening, r.kategori, r.tipe_normal`,
    );
    const [incomeRows] = await connection.query<IncomeRow[]>(
      `SELECT
        r.kategori,
        r.tipe_normal AS tipeNormal,
        COALESCE(SUM(CASE WHEN ju.id IS NOT NULL AND jd.posisi = 'debit' THEN jd.jumlah ELSE 0 END), 0) AS totalDebit,
        COALESCE(SUM(CASE WHEN ju.id IS NOT NULL AND jd.posisi = 'kredit' THEN jd.jumlah ELSE 0 END), 0) AS totalKredit
       FROM rekening r
       LEFT JOIN jurnal_detail jd ON jd.kode_rekening = r.kode_rekening
       LEFT JOIN jurnal_umum ju
        ON ju.id = jd.id_jurnal
        AND ju.status_posting = 'posted'
       WHERE r.status = 'aktif'
        AND r.kategori IN ('pendapatan', 'beban')
       GROUP BY r.kode_rekening, r.kategori, r.tipe_normal`,
    );

    connection.release();
    const totalSavings = toNumber(totalSimpanan[0]?.total);
    const totalLoans = toNumber(totalPinjaman[0]?.total);
    const totalCash = toNumber(saldoKas[0]?.total);
    const legacyAssets = totalSavings + totalLoans + totalCash;
    const totalAssetsFromAccounting = balanceRows
      .filter((row) => row.kategori === "aset")
      .reduce((sum, row) => sum + Math.max(normalBalance(row), 0), 0);
    const totalLiabilitiesFromAccounting = balanceRows
      .filter((row) => row.kategori === "liabilitas")
      .reduce((sum, row) => sum + Math.max(normalBalance(row), 0), 0);
    const totalEquityFromAccounting = balanceRows
      .filter((row) => row.kategori === "modal")
      .reduce((sum, row) => sum + Math.max(normalBalance(row), 0), 0);
    const totalRevenue = incomeRows
      .filter((row) => row.kategori === "pendapatan")
      .reduce((sum, row) => sum + Math.max(normalBalance(row), 0), 0);
    const totalExpense = incomeRows
      .filter((row) => row.kategori === "beban")
      .reduce((sum, row) => sum + Math.max(normalBalance(row), 0), 0);
    const estimatedShu = totalRevenue - totalExpense || toNumber(totalBunga[0]?.total);
    const totalAssets = totalAssetsFromAccounting || legacyAssets;
    const totalLiabilities = totalLiabilitiesFromAccounting || totalSavings;
    const totalEquity =
      totalEquityFromAccounting || Math.max(totalAssets - totalLiabilities, 0);
    const saving = savingSummary[0];

    return NextResponse.json({
      success: true,
      data: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        estimatedShu,
        totalSavings,
        totalLoans,
        totalCash,
        totalMembers: totalAnggota[0]?.total || 0,
        cards: {
          wajib: {
            count: toNumber(saving?.wajibCount),
            total: toNumber(saving?.wajibTotal),
          },
          pokok: {
            count:
              toNumber(saving?.pokokCount) ||
              toNumber(saving?.lebaranCount) +
                toNumber(saving?.pendidikanCount),
            total:
              toNumber(saving?.pokokTotal) ||
              toNumber(saving?.lebaranTotal) +
                toNumber(saving?.pendidikanTotal),
          },
          sukarela: {
            count: toNumber(saving?.sukarelaCount),
            total: toNumber(saving?.sukarelaTotal),
          },
          pinjaman: {
            count: toNumber(pinjamanCount[0]?.total),
            total: totalLoans,
          },
        },
        recentLoans,
      },
    });
  } catch (error) {
    console.error("Get bendahara dashboard error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
