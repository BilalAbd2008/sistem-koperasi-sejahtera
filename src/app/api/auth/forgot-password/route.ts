import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { error: "Email wajib diisi" },
        { status: 400 },
      );
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(128) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_password_reset_token (token),
        INDEX idx_password_reset_user (user_id),
        FOREIGN KEY (user_id) REFERENCES pengguna(id) ON DELETE CASCADE
      )
    `);

    const [users] = await connection.query(
      'SELECT id, nama_lengkap, email FROM pengguna WHERE email = ? AND status = "aktif" LIMIT 1',
      [email],
    );

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "Jika email terdaftar, tautan reset password akan dikirim ke email Anda.",
      });
    }

    const user = users[0] as {
      id: number;
      nama_lengkap: string;
      email: string;
    };

    const token = crypto.randomBytes(32).toString("hex");

    await connection.query(
      "DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL",
      [user.id],
    );

    await connection.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))",
      [user.id, token],
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({
      to: user.email,
      name: user.nama_lengkap,
      resetUrl,
    });

    return NextResponse.json({
      success: true,
      message:
        "Jika email terdaftar, tautan reset password akan dikirim ke email Anda.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
