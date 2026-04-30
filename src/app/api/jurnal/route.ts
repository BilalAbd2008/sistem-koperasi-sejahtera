import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jenis = searchParams.get("jenis");

    const connection = await pool.getConnection();

    let query = `
      SELECT t.*, a.nama
      FROM transaksi_lain t
      LEFT JOIN anggota a ON t.id_anggota = a.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (jenis) {
      query += " AND t.jenis_transaksi = ?";
      params.push(jenis);
    }

    query += " ORDER BY t.tanggal_transaksi DESC";

    const [rows] = await connection.query(query, params);
    connection.release();

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get jurnal error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      id_anggota,
      jenis_transaksi,
      jumlah,
      tipe,
      tanggal_transaksi,
      keterangan,
    } = await request.json();
    const connection = await pool.getConnection();

    await connection.query(
      "INSERT INTO transaksi_lain (id_anggota, jenis_transaksi, jumlah, tipe, tanggal_transaksi, keterangan) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id_anggota || null,
        jenis_transaksi,
        jumlah,
        tipe,
        tanggal_transaksi || new Date(),
        keterangan,
      ],
    );

    connection.release();

    return NextResponse.json({
      success: true,
      message: "Jurnal berhasil ditambahkan",
    });
  } catch (error) {
    console.error("Create jurnal error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
