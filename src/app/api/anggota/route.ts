import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [anggota] = await connection.query(
      "SELECT * FROM anggota ORDER BY tanggal_bergabung DESC",
    );
    connection.release();

    return NextResponse.json({
      success: true,
      data: anggota,
    });
  } catch (error) {
    console.error("Get anggota error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nama, email, no_telepon, alamat } = await request.json();

    const no_anggota = `AGT-${Date.now()}`;

    const connection = await pool.getConnection();
    await connection.query(
      "INSERT INTO anggota (no_anggota, nama, email, no_telepon, alamat, tanggal_bergabung) VALUES (?, ?, ?, ?, ?, NOW())",
      [no_anggota, nama, email, no_telepon, alamat],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Anggota berhasil ditambahkan",
    });
  } catch (error) {
    console.error("Create anggota error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, nama, email, no_telepon, alamat, status } =
      await request.json();

    const connection = await pool.getConnection();
    await connection.query(
      "UPDATE anggota SET nama = ?, email = ?, no_telepon = ?, alamat = ?, status = ? WHERE id = ?",
      [nama, email, no_telepon, alamat, status, id],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Anggota berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update anggota error:", error);
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
    await connection.query("DELETE FROM anggota WHERE id = ?", [id]);
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Anggota berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete anggota error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
