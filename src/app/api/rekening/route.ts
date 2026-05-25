import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

type ColumnRow = RowDataPacket & {
  COLUMN_NAME: string;
};

type RekeningLookupRow = RowDataPacket & {
  kode_rekening: string;
};

async function ensureRekeningHierarchyColumns(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
) {
  const [columns] = await connection.query<ColumnRow[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'rekening'
       AND COLUMN_NAME IN ('jenis_akun', 'parent_kode_rekening')`,
  );
  const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
  const addedJenisAkun = !existingColumns.has("jenis_akun");

  if (addedJenisAkun) {
    await connection.query(
      "ALTER TABLE rekening ADD COLUMN jenis_akun ENUM('parent', 'child') NOT NULL DEFAULT 'child' AFTER tipe_normal",
    );
  }

  if (!existingColumns.has("parent_kode_rekening")) {
    await connection.query(
      "ALTER TABLE rekening ADD COLUMN parent_kode_rekening VARCHAR(20) NULL AFTER jenis_akun",
    );
  }

  await connection.query(
    "UPDATE rekening SET jenis_akun = 'parent', parent_kode_rekening = NULL WHERE RIGHT(kode_rekening, 3) = '000'",
  );
}

/**
 * GET /api/rekening
 * Get Chart of Accounts (Daftar Rekening)
 * Query params:
 *   - kategori: aset|liabilitas|modal|pendapatan|beban (optional)
 *   - status: aktif|nonaktif (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const kategori = searchParams.get("kategori");
    const status = searchParams.get("status") || "aktif";

    const connection = await pool.getConnection();

    try {
      await ensureRekeningHierarchyColumns(connection);

      let query = "SELECT * FROM rekening WHERE 1=1";
      const params: unknown[] = [];

      if (kategori) {
        query += " AND kategori = ?";
        params.push(kategori);
      }
      if (status) {
        query += " AND status = ?";
        params.push(status);
      }

      query += " ORDER BY COALESCE(parent_kode_rekening, kode_rekening), jenis_akun DESC, kode_rekening ASC";

      const [rows] = await connection.query(query, params);

      return NextResponse.json({
        success: true,
        data: rows,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("GET /api/rekening error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/rekening
 * Create new Chart of Account entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const kodeRekening = body.kodeRekening || body.kode_rekening;
    const namaRekening = body.namaRekening || body.nama_rekening;
    const tipeNormal = body.tipeNormal || body.tipe_normal;
    const jenisAkun = body.jenisAkun || body.jenis_akun || "child";
    const parentKodeRekening = body.parentKodeRekening || body.parent_kode_rekening || null;
    const { deskripsi, kategori, status } = body;

    if (!kodeRekening || !namaRekening || !kategori || !tipeNormal) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: kodeRekening, namaRekening, kategori, tipeNormal",
        },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      await ensureRekeningHierarchyColumns(connection);

      if (jenisAkun === "child" && !parentKodeRekening) {
        return NextResponse.json(
          {
            success: false,
            error: "Akun child wajib memilih parent",
          },
          { status: 400 },
        );
      }

      if (jenisAkun === "child") {
        const [parentRows] = await connection.query<RekeningLookupRow[]>(
          "SELECT kode_rekening FROM rekening WHERE kode_rekening = ? AND jenis_akun = 'parent' AND status = 'aktif'",
          [parentKodeRekening],
        );

        if (parentRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Parent akun tidak ditemukan atau tidak aktif" },
            { status: 400 },
          );
        }
      }

      await connection.query(
        `INSERT INTO rekening (kode_rekening, nama_rekening, deskripsi, kategori, tipe_normal, jenis_akun, parent_kode_rekening, status, tanggal_buat)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
        [
          kodeRekening,
          namaRekening,
          deskripsi || null,
          kategori,
          tipeNormal,
          jenisAkun,
          jenisAkun === "parent" ? null : parentKodeRekening,
          status || "aktif",
        ],
      );

      return NextResponse.json({
        success: true,
        message: "Rekening berhasil ditambahkan",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("POST /api/rekening error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/rekening
 * Update Chart of Account entry
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const kodeRekening = body.kodeRekening || body.kode_rekening;
    const namaRekening = body.namaRekening || body.nama_rekening;
    const tipeNormal = body.tipeNormal || body.tipe_normal;
    const jenisAkun = body.jenisAkun || body.jenis_akun;
    const parentKodeRekening = body.parentKodeRekening || body.parent_kode_rekening || null;
    const { deskripsi, kategori, status } = body;

    if (!kodeRekening) {
      return NextResponse.json(
        { success: false, error: "kodeRekening is required" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      await ensureRekeningHierarchyColumns(connection);

      if (jenisAkun === "child" && !parentKodeRekening) {
        return NextResponse.json(
          {
            success: false,
            error: "Akun child wajib memilih parent",
          },
          { status: 400 },
        );
      }

      if (jenisAkun === "child") {
        const [parentRows] = await connection.query<RekeningLookupRow[]>(
          "SELECT kode_rekening FROM rekening WHERE kode_rekening = ? AND kode_rekening <> ? AND jenis_akun = 'parent' AND status = 'aktif'",
          [parentKodeRekening, kodeRekening],
        );

        if (parentRows.length === 0) {
          return NextResponse.json(
            { success: false, error: "Parent akun tidak ditemukan atau tidak aktif" },
            { status: 400 },
          );
        }
      }

      await connection.query(
        `UPDATE rekening 
         SET nama_rekening = ?, deskripsi = ?, kategori = COALESCE(?, kategori), tipe_normal = COALESCE(?, tipe_normal), jenis_akun = COALESCE(?, jenis_akun), parent_kode_rekening = ?, status = ?
         WHERE kode_rekening = ?`,
        [
          namaRekening || null,
          deskripsi || null,
          kategori || null,
          tipeNormal || null,
          jenisAkun || null,
          jenisAkun === "parent" ? null : parentKodeRekening,
          status || "aktif",
          kodeRekening,
        ],
      );

      return NextResponse.json({
        success: true,
        message: "Rekening berhasil diperbarui",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("PUT /api/rekening error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/rekening
 * Delete Chart of Account entry
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { kodeRekening } = body;

    if (!kodeRekening) {
      return NextResponse.json(
        { success: false, error: "kodeRekening is required" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      await connection.query("DELETE FROM rekening WHERE kode_rekening = ?", [
        kodeRekening,
      ]);

      return NextResponse.json({
        success: true,
        message: "Rekening berhasil dihapus",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("DELETE /api/rekening error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
