import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { PoolConnection } from "mysql2/promise";

let anggotaMigrationPromise: Promise<void> | null = null;

async function ensureAnggotaColumns(connection: PoolConnection) {
  if (!anggotaMigrationPromise) {
    anggotaMigrationPromise = (async () => {
      const [columns] = await connection.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anggota' AND COLUMN_NAME = 'status_pekerjaan'",
      );

      if ((columns as Array<{ COLUMN_NAME: string }>).length === 0) {
        await connection.query(
          "ALTER TABLE anggota ADD COLUMN status_pekerjaan VARCHAR(100) NULL AFTER alamat",
        );
      }
    })();
  }

  await anggotaMigrationPromise;
}

export async function GET() {
  try {
    const connection = await pool.getConnection();
    await ensureAnggotaColumns(connection);
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
    const { nama, email, no_telepon, alamat, status_pekerjaan } =
      await request.json();

    const connection = await pool.getConnection();
    await ensureAnggotaColumns(connection);
    const [countRows] = await connection.query(
      "SELECT COUNT(*) AS total FROM anggota",
    );
    const total = Number((countRows as Array<{ total: number }>)[0]?.total || 0);
    let nextNumber = total + 1;
    let no_anggota = `AGT-${String(nextNumber).padStart(4, "0")}`;

    while (true) {
      const [existingRows] = await connection.query(
        "SELECT id FROM anggota WHERE no_anggota = ? LIMIT 1",
        [no_anggota],
      );
      if ((existingRows as Array<{ id: number }>).length === 0) break;
      nextNumber += 1;
      no_anggota = `AGT-${String(nextNumber).padStart(4, "0")}`;
    }

    await connection.query(
      "INSERT INTO anggota (no_anggota, nama, email, no_telepon, alamat, status_pekerjaan, tanggal_bergabung, status) VALUES (?, ?, ?, ?, ?, ?, NOW(), 'aktif')",
      [no_anggota, nama, email, no_telepon, alamat, status_pekerjaan || null],
    );
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Anggota berhasil ditambahkan",
      data: { no_anggota },
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
    const { id, nama, email, no_telepon, alamat, status_pekerjaan, status } =
      await request.json();

    const connection = await pool.getConnection();
    await ensureAnggotaColumns(connection);
    await connection.query(
      "UPDATE anggota SET nama = ?, email = ?, no_telepon = ?, alamat = ?, status_pekerjaan = ?, status = ? WHERE id = ?",
      [nama, email, no_telepon, alamat, status_pekerjaan || null, status, id],
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
