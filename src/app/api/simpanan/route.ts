import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id_anggota = searchParams.get("id_anggota");

    const connection = await pool.getConnection();

    let query = `
      SELECT s.*, a.nama, a.no_anggota 
      FROM simpanan s 
      JOIN anggota a ON s.id_anggota = a.id
    `;
    let params: any[] = [];

    if (id_anggota) {
      query += " WHERE s.id_anggota = ?";
      params.push(id_anggota);
    }

    query += " ORDER BY s.tanggal_simpanan DESC";

    const [simpanan] = await connection.query(query, params);
    connection.release();

    return NextResponse.json({
      success: true,
      data: simpanan,
    });
  } catch (error) {
    console.error("Get simpanan error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id_anggota, jenis_simpanan, jumlah } = await request.json();

    const connection = await pool.getConnection();
    await connection.query(
      "INSERT INTO simpanan (id_anggota, jenis_simpanan, jumlah, tanggal_simpanan) VALUES (?, ?, ?, NOW())",
      [id_anggota, jenis_simpanan, jumlah],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Simpanan berhasil ditambahkan",
    });
  } catch (error) {
    console.error("Create simpanan error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, id_anggota, jenis_simpanan, jumlah, status } =
      await request.json();

    const connection = await pool.getConnection();
    await connection.query(
      "UPDATE simpanan SET id_anggota = ?, jenis_simpanan = ?, jumlah = ?, status = ? WHERE id = ?",
      [id_anggota, jenis_simpanan, jumlah, status, id],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Simpanan berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update simpanan error:", error);
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
    await connection.query("DELETE FROM simpanan WHERE id = ?", [id]);
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Simpanan berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete simpanan error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
