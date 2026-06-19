import { NextRequest, NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

type UserRow = RowDataPacket & {
  id: number;
  password: string;
  role: string;
};

export async function PUT(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const { id, nama_lengkap, username, email } = await request.json();
    const userId = Number(id);
    const nextName = String(nama_lengkap || "").trim();
    const nextUsername = String(username || "").trim();
    const nextEmail = String(email || "").trim();

    if (!userId || !nextName || !nextUsername || !nextEmail) {
      return NextResponse.json(
        { success: false, error: "Nama, username, dan email wajib diisi" },
        { status: 400 },
      );
    }

    const [duplicateRows] = await connection.query<RowDataPacket[]>(
      `SELECT id
       FROM pengguna
       WHERE id <> ? AND (username = ? OR email = ?)
       LIMIT 1`,
      [userId, nextUsername, nextEmail],
    );

    if (duplicateRows.length > 0) {
      return NextResponse.json(
        { success: false, error: "Username atau email sudah digunakan" },
        { status: 409 },
      );
    }

    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE pengguna
       SET nama_lengkap = ?, username = ?, email = ?
       WHERE id = ? AND role = "bendahara"`,
      [nextName, nextUsername, nextEmail, userId],
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: "Profil bendahara tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui",
      user: {
        id: userId,
        nama_lengkap: nextName,
        username: nextUsername,
        email: nextEmail,
        role: "bendahara",
      },
    });
  } catch (error) {
    console.error("Update bendahara profile error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}

export async function PATCH(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const { id, current_password, new_password } = await request.json();
    const userId = Number(id);
    const currentPassword = String(current_password || "");
    const newPassword = String(new_password || "");

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Password lama dan password baru wajib diisi" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password baru minimal 6 karakter" },
        { status: 400 },
      );
    }

    const [rows] = await connection.query<UserRow[]>(
      `SELECT id, password, role
       FROM pengguna
       WHERE id = ? AND role = "bendahara" AND status = "aktif"
       LIMIT 1`,
      [userId],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Akun bendahara tidak ditemukan" },
        { status: 404 },
      );
    }

    if (rows[0].password !== currentPassword) {
      return NextResponse.json(
        { success: false, error: "Password lama tidak sesuai" },
        { status: 401 },
      );
    }

    await connection.query("UPDATE pengguna SET password = ? WHERE id = ?", [
      newPassword,
      userId,
    ]);

    return NextResponse.json({
      success: true,
      message: "Password berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update bendahara password error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
