import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

type LoginUserRow = RowDataPacket & {
  id: number;
  username: string;
  password: string;
  nama_lengkap: string;
  email: string;
  role: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    const connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT * FROM pengguna WHERE (username = ? OR email = ?) AND status = "aktif" AND role = "bendahara"',
      [username, username],
    );

    if (Array.isArray(users) && users.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 },
      );
    }

    const user = (users as LoginUserRow[])[0];

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
