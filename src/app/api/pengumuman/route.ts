import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const target_role = searchParams.get("target_role");

    const connection = await pool.getConnection();

    let query = "SELECT * FROM pengumuman WHERE status = 'aktif'";
    let params: any[] = [];

    if (target_role) {
      query += " AND (target_role = 'all' OR target_role = ?)";
      params.push(target_role);
    }

    query += " ORDER BY tanggal_pengumuman DESC";

    const [pengumuman] = await connection.query(query, params);
    connection.release();

    return NextResponse.json({
      success: true,
      data: pengumuman,
    });
  } catch (error) {
    console.error("Get pengumuman error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { judul, isi, tanggal_pengumuman, target_role } = await request.json();

    const connection = await pool.getConnection();
    await connection.query(
      "INSERT INTO pengumuman (judul, isi, tanggal_pengumuman, target_role) VALUES (?, ?, ?, ?)",
      [judul, isi, tanggal_pengumuman, target_role || "all"],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil dibuat",
    });
  } catch (error) {
    console.error("Create pengumuman error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, judul, isi, tanggal_pengumuman, target_role, status } = await request.json();

    const connection = await pool.getConnection();
    await connection.query(
      "UPDATE pengumuman SET judul = ?, isi = ?, tanggal_pengumuman = ?, target_role = ?, status = ? WHERE id = ?",
      [judul, isi, tanggal_pengumuman, target_role, status, id],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update pengumuman error:", error);
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
    await connection.query("DELETE FROM pengumuman WHERE id = ?", [id]);
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Pengumuman berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete pengumuman error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
