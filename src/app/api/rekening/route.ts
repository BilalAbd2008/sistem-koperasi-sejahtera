import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

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
      let query = "SELECT * FROM rekening WHERE 1=1";
      const params: any[] = [];

      if (kategori) {
        query += " AND kategori = ?";
        params.push(kategori);
      }
      if (status) {
        query += " AND status = ?";
        params.push(status);
      }

      query += " ORDER BY kode_rekening ASC";

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
      await connection.query(
        `INSERT INTO rekening (kode_rekening, nama_rekening, deskripsi, kategori, tipe_normal, status, tanggal_buat)
        VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
        [
          kodeRekening,
          namaRekening,
          deskripsi || null,
          kategori,
          tipeNormal,
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
    const { deskripsi, kategori, status } = body;

    if (!kodeRekening) {
      return NextResponse.json(
        { success: false, error: "kodeRekening is required" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      await connection.query(
        `UPDATE rekening 
         SET nama_rekening = ?, deskripsi = ?, kategori = COALESCE(?, kategori), tipe_normal = COALESCE(?, tipe_normal), status = ?
         WHERE kode_rekening = ?`,
        [
          namaRekening || null,
          deskripsi || null,
          kategori || null,
          tipeNormal || null,
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
