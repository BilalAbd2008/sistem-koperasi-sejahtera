import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    const anggotaId = request.nextUrl.searchParams.get("anggota_id");

    if (!userId || !anggotaId) {
      return NextResponse.json(
        { error: "user_id dan anggota_id wajib diisi" },
        { status: 400 },
      );
    }

    const [rows] = await connection.query(
      `SELECT
         u.id AS user_id,
         u.username,
         u.nama_lengkap,
         u.email,
         a.id AS anggota_id,
         a.no_anggota,
         a.no_telepon,
         a.alamat,
         a.tanggal_bergabung,
         a.status
       FROM pengguna u
       JOIN anggota a ON a.id = ?
       WHERE u.id = ?
       LIMIT 1`,
      [anggotaId, userId],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get profile anggota error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}

export async function PUT(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const {
      user_id,
      anggota_id,
      nama_lengkap,
      username,
      email,
      no_telepon,
      alamat,
    } = await request.json();

    if (!user_id || !anggota_id || !nama_lengkap || !username || !email) {
      return NextResponse.json(
        { error: "Data profil belum lengkap" },
        { status: 400 },
      );
    }

    await connection.beginTransaction();

    await connection.query(
      "UPDATE pengguna SET nama_lengkap = ?, username = ?, email = ? WHERE id = ?",
      [nama_lengkap, username, email, user_id],
    );

    await connection.query(
      "UPDATE anggota SET nama = ?, email = ?, no_telepon = ?, alamat = ? WHERE id = ?",
      [nama_lengkap, email, no_telepon || null, alamat || null, anggota_id],
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update profile anggota error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
