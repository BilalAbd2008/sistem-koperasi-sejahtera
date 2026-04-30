import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const connection = await pool.getConnection();

    // Total Members
    const [totalAnggota] = await connection.query(
      'SELECT COUNT(*) as total FROM anggota WHERE status = "aktif"'
    );

    // Total Savings
    const [totalSimpanan] = await connection.query(
      'SELECT SUM(jumlah) as total FROM simpanan WHERE status = "aktif"'
    );

    // Total Loans Active
    const [totalPinjaman] = await connection.query(
      'SELECT SUM(jumlah_pinjam) as total FROM pinjaman WHERE status = "aktif"'
    );

    // Total Interest Income
    const [totalBunga] = await connection.query(
      'SELECT SUM(jumlah_bunga) as total FROM pinjaman WHERE status IN ("aktif", "lunas")'
    );

    connection.release();

    return NextResponse.json({
      success: true,
      data: {
        totalMembers: (totalAnggota as any[])[0]?.total || 0,
        totalSavings: (totalSimpanan as any[])[0]?.total || 0,
        totalLoans: (totalPinjaman as any[])[0]?.total || 0,
        totalInterest: (totalBunga as any[])[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
