import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token dan password wajib diisi" },
        { status: 400 },
      );
    }

    const [tokens] = await connection.query(
      "SELECT id, user_id FROM password_reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1",
      [token],
    );

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json(
        { error: "Token reset tidak valid atau sudah kadaluarsa" },
        { status: 400 },
      );
    }

    const tokenRow = tokens[0] as { id: number; user_id: number };

    await connection.beginTransaction();

    await connection.query("UPDATE pengguna SET password = ? WHERE id = ?", [
      password,
      tokenRow.user_id,
    ]);

    await connection.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?",
      [tokenRow.id],
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Password berhasil direset",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
