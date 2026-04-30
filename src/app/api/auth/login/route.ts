import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { username, password, role } = await request.json();

    const connection = await pool.getConnection();
    const query = role
      ? 'SELECT * FROM pengguna WHERE username = ? AND status = "aktif" AND role = ?'
      : 'SELECT * FROM pengguna WHERE username = ? AND status = "aktif"';
    const queryParams = role ? [username, role] : [username];

    const [users] = await connection.query(query, queryParams);

    if (Array.isArray(users) && users.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 },
      );
    }

    const user = (users as any[])[0];

    // In production, use bcrypt for password hashing
    if (user.password !== password) {
      connection.release();
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 },
      );
    }

    // For anggota role, fetch anggota_id
    let anggota_id = null;
    if (user.role === "anggota") {
      const [anggotaRows] = await connection.query(
        "SELECT id FROM anggota WHERE nama = ? OR email = ? LIMIT 1",
        [user.nama_lengkap, user.email],
      );
      if (Array.isArray(anggotaRows) && anggotaRows.length > 0) {
        anggota_id = (anggotaRows as any[])[0].id;
      }
    }

    connection.release();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
        role: user.role,
        anggota_id,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
