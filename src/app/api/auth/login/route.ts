import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT * FROM pengguna WHERE username = ? AND status = "aktif" AND role = "bendahara"',
      [username],
    );

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

    connection.release();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nama_lengkap: user.nama_lengkap,
        email: user.email,
        role: user.role,
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
