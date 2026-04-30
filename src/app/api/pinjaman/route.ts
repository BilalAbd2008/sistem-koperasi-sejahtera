import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id_anggota = searchParams.get("id_anggota");

    const connection = await pool.getConnection();

    let query = `
      SELECT p.*, a.nama, a.no_anggota 
      FROM pinjaman p 
      JOIN anggota a ON p.id_anggota = a.id
    `;
    let params: any[] = [];

    if (id_anggota) {
      query += " WHERE p.id_anggota = ?";
      params.push(id_anggota);
    }

    query += " ORDER BY p.tanggal_pinjam DESC";

    const [pinjaman] = await connection.query(query, params);
    connection.release();

    return NextResponse.json({
      success: true,
      data: pinjaman,
    });
  } catch (error) {
    console.error("Get pinjaman error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id_anggota, jumlah_pinjam, jumlah_bunga, jangka_waktu } =
      await request.json();

    const connection = await pool.getConnection();

    const jatuh_tempo = new Date();
    jatuh_tempo.setMonth(jatuh_tempo.getMonth() + jangka_waktu);

    await connection.query(
      `INSERT INTO pinjaman (id_anggota, jumlah_pinjam, jumlah_bunga, jangka_waktu, tanggal_pinjam, tanggal_jatuh_tempo) 
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [id_anggota, jumlah_pinjam, jumlah_bunga, jangka_waktu, jatuh_tempo],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Pinjaman berhasil ditambahkan",
    });
  } catch (error) {
    console.error("Create pinjaman error:", error);
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
      id_anggota,
      jumlah_pinjam,
      jumlah_bunga,
      jangka_waktu,
      status,
    } = await request.json();

    const connection = await pool.getConnection();
    const jatuh_tempo = new Date();
    jatuh_tempo.setMonth(jatuh_tempo.getMonth() + Number(jangka_waktu || 0));

    await connection.query(
      "UPDATE pinjaman SET id_anggota = ?, jumlah_pinjam = ?, jumlah_bunga = ?, jangka_waktu = ?, tanggal_jatuh_tempo = ?, status = ? WHERE id = ?",
      [
        id_anggota,
        jumlah_pinjam,
        jumlah_bunga,
        jangka_waktu,
        jatuh_tempo,
        status,
        id,
      ],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Pinjaman berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update pinjaman error:", error);
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
    await connection.query("DELETE FROM pinjaman WHERE id = ?", [id]);
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Pinjaman berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete pinjaman error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
