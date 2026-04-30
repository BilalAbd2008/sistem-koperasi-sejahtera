import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT * FROM pengaturan_sistem ORDER BY key_setting ASC",
    );
    connection.release();

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get pengaturan error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key_setting, value_setting, deskripsi } = await request.json();
    const connection = await pool.getConnection();

    await connection.query(
      `INSERT INTO pengaturan_sistem (key_setting, value_setting, deskripsi)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value_setting = VALUES(value_setting), deskripsi = VALUES(deskripsi)`,
      [key_setting, value_setting, deskripsi],
    );

    connection.release();

    return NextResponse.json({
      success: true,
      message: "Pengaturan tersimpan",
    });
  } catch (error) {
    console.error("Save pengaturan error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
