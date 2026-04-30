import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const { nama_lengkap, username, email, password, no_telepon, alamat } =
      await request.json();

    if (!nama_lengkap || !username || !email || !password) {
      return NextResponse.json(
        { error: "Nama, username, email, dan password wajib diisi" },
        { status: 400 },
      );
    }

    await connection.beginTransaction();

    const [existingUser] = await connection.query(
      "SELECT id FROM pengguna WHERE username = ? OR email = ? LIMIT 1",
      [username, email],
    );

    if (Array.isArray(existingUser) && existingUser.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Username atau email sudah terdaftar" },
        { status: 409 },
      );
    }

    const no_anggota = `AGT-${Date.now()}`;

    const [anggotaResult] = await connection.query(
      "INSERT INTO anggota (no_anggota, nama, email, no_telepon, alamat, tanggal_bergabung, status) VALUES (?, ?, ?, ?, ?, CURDATE(), 'aktif')",
      [no_anggota, nama_lengkap, email, no_telepon || null, alamat || null],
    );

    const anggota_id = (anggotaResult as any).insertId;

    const [userResult] = await connection.query(
      "INSERT INTO pengguna (username, password, nama_lengkap, email, role, status) VALUES (?, ?, ?, ?, 'anggota', 'aktif')",
      [username, password, nama_lengkap, email],
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Registrasi berhasil",
      user: {
        id: (userResult as any).insertId,
        username,
        nama_lengkap,
        email,
        role: "anggota",
        anggota_id,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
