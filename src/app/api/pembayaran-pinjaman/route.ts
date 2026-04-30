import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id_pinjaman = searchParams.get("id_pinjaman");
    const id_anggota = searchParams.get("id_anggota");

    const connection = await pool.getConnection();

    let query = `
      SELECT pp.*, p.id_anggota 
      FROM pembayaran_pinjaman pp 
      JOIN pinjaman p ON pp.id_pinjaman = p.id
    `;
    let params: any[] = [];
    const conditions = [];

    if (id_pinjaman) {
      conditions.push("pp.id_pinjaman = ?");
      params.push(id_pinjaman);
    }

    if (id_anggota) {
      conditions.push("p.id_anggota = ?");
      params.push(id_anggota);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY pp.tanggal_bayar DESC";

    const [pembayaran] = await connection.query(query, params);
    connection.release();

    return NextResponse.json({
      success: true,
      data: pembayaran,
    });
  } catch (error) {
    console.error("Get pembayaran error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id_pinjaman, jumlah_bayar, keterangan } = await request.json();

    const connection = await pool.getConnection();

    await connection.query(
      "INSERT INTO pembayaran_pinjaman (id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan) VALUES (?, ?, NOW(), ?)",
      [id_pinjaman, jumlah_bayar, keterangan],
    );

    connection.release();

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil dicatat",
    });
  } catch (error) {
    console.error("Create pembayaran error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan } =
      await request.json();

    const connection = await pool.getConnection();
    await connection.query(
      "UPDATE pembayaran_pinjaman SET id_pinjaman = ?, jumlah_bayar = ?, tanggal_bayar = ?, keterangan = ? WHERE id = ?",
      [id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan, id],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update pembayaran error:", error);
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
    await connection.query("DELETE FROM pembayaran_pinjaman WHERE id = ?", [
      id,
    ]);
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete pembayaran error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
