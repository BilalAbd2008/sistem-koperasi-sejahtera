import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const connection = await pool.getConnection();

    const [totalAnggota] = await connection.query(
      'SELECT COUNT(*) AS total FROM anggota WHERE status = "aktif"',
    );
    const [totalSimpanan] = await connection.query(
      'SELECT COALESCE(SUM(jumlah), 0) AS total FROM simpanan WHERE status = "aktif"',
    );
    const [totalPinjaman] = await connection.query(
      'SELECT COALESCE(SUM(jumlah_pinjam), 0) AS total FROM pinjaman WHERE status = "aktif"',
    );
    const [saldoKas] = await connection.query(
      'SELECT COALESCE(SUM(CASE WHEN tipe = "kredit" THEN jumlah ELSE -jumlah END), 0) AS total FROM transaksi_lain',
    );
    const [recentLoans] = await connection.query(
      `SELECT p.id, a.nama, p.jumlah_pinjam, p.tanggal_pinjam, p.status
       FROM pinjaman p
       JOIN anggota a ON p.id_anggota = a.id
       ORDER BY p.tanggal_pinjam DESC
       LIMIT 3`,
    );

    connection.release();

    return NextResponse.json({
      success: true,
      data: {
        totalAssets:
          Number((totalSimpanan as any[])[0]?.total || 0) +
          Number((saldoKas as any[])[0]?.total || 0),
        totalSavings: Number((totalSimpanan as any[])[0]?.total || 0),
        totalLoans: Number((totalPinjaman as any[])[0]?.total || 0),
        totalCash: Number((saldoKas as any[])[0]?.total || 0),
        totalMembers: (totalAnggota as any[])[0]?.total || 0,
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
