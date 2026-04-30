import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periode_awal = searchParams.get("periode_awal");
    const periode_akhir = searchParams.get("periode_akhir");

    const connection = await pool.getConnection();

    let query = "SELECT * FROM laporan_keuangan WHERE 1=1";
    let params: any[] = [];

    if (periode_awal) {
      query += " AND periode_awal >= ?";
      params.push(periode_awal);
    }

    if (periode_akhir) {
      query += " AND periode_akhir <= ?";
      params.push(periode_akhir);
    }

    query += " ORDER BY periode_akhir DESC";

    const [laporan] = await connection.query(query, params);
    connection.release();

    return NextResponse.json({
      success: true,
      data: laporan,
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
