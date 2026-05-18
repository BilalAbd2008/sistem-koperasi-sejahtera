import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  postJournalEntry,
  createSavingJournalEntry,
  createLoanJournalEntry,
  createInstallmentJournalEntry,
} from "@/lib/accounting";

export const dynamic = "force-dynamic";

/**
 * GET /api/jurnal
 * Query params:
 *   - system: 'old' (transaksi_lain) | 'new' (jurnal_umum) | 'all' (default)
 *   - periode: YYYY-MM (untuk new system)
 *   - tipeJurnal: manual|simpanan|pinjaman|bunga|biaya|koreksi (untuk new system)
 *   - statusPosting: draft|posted|reversed (untuk new system)
 *   - jenis: jenis_transaksi (untuk old system)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const system = searchParams.get("system") || "all"; // 'old' | 'new' | 'all'
    const periode = searchParams.get("periode");
    const tipeJurnal = searchParams.get("tipeJurnal");
    const statusPosting = searchParams.get("statusPosting") || "posted";
    const jenis = searchParams.get("jenis");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const connection = await pool.getConnection();

    try {
      let allData: any[] = [];

      // Fetch from old system (transaksi_lain)
      if (system === "old" || system === "all") {
        let oldQuery = `
          SELECT 
            t.*, 
            a.nama,
            'legacy' as systemType
          FROM transaksi_lain t
          LEFT JOIN anggota a ON t.id_anggota = a.id
          WHERE 1=1
        `;
        const oldParams: unknown[] = [];

        if (jenis) {
          oldQuery += " AND t.jenis_transaksi = ?";
          oldParams.push(jenis);
        }

        oldQuery += " ORDER BY t.tanggal_transaksi DESC LIMIT ? OFFSET ?";
        oldParams.push(limit, offset);

        const [oldRows] = await connection.query(oldQuery, oldParams);
        allData = [...(oldRows as any[])];
      }

      // Fetch from new system (jurnal_umum)
      if (system === "new" || system === "all") {
        let newQuery = `
          SELECT 
            ju.*, 
            'modern' as systemType
          FROM jurnal_umum ju
          WHERE 1=1
        `;
        const newParams: any[] = [];

        if (periode) {
          newQuery += " AND ju.periode = ?";
          newParams.push(periode);
        }
        if (tipeJurnal) {
          newQuery += " AND ju.tipe_jurnal = ?";
          newParams.push(tipeJurnal);
        }
        if (statusPosting) {
          newQuery += " AND ju.status_posting = ?";
          newParams.push(statusPosting);
        }

        newQuery += " ORDER BY ju.tanggal_jurnal DESC LIMIT ? OFFSET ?";
        newParams.push(limit, offset);

        const [newRows] = await connection.query(newQuery, newParams);

        // Enrich dengan details
        const enrichedRows = await Promise.all(
          (newRows as any[]).map(async (ju) => {
            const [details] = await connection.query(
              `SELECT 
                jd.kode_rekening,
                jd.posisi,
                jd.jumlah,
                jd.keterangan,
                jd.id_anggota,
                r.nama_rekening
              FROM jurnal_detail jd
              LEFT JOIN rekening r ON jd.kode_rekening = r.kode_rekening
              WHERE jd.id_jurnal = ?
              ORDER BY jd.posisi DESC`,
              [ju.id],
            );
            return { ...ju, details };
          }),
        );

        allData = [...allData, ...enrichedRows];
      }

      return NextResponse.json({
        success: true,
        data: allData,
        system,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("GET /api/jurnal error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/jurnal
 * Body:
 *   - system: 'old' | 'new' (default)
 *   - [untuk new system] tanggalJurnal, periode, deskripsi, tipeJurnal, idPengguna, lines
 *   - [untuk old system] id_anggota, jenis_transaksi, jumlah, tipe, tanggal_transaksi, keterangan
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const system = body.system || "new";

    const connection = await pool.getConnection();

    try {
      if (system === "old") {
        // Legacy path - insert ke transaksi_lain
        const {
          id_anggota,
          jenis_transaksi,
          jumlah,
          tipe,
          tanggal_transaksi,
          keterangan,
        } = body;

        await connection.query(
          "INSERT INTO transaksi_lain (id_anggota, jenis_transaksi, jumlah, tipe, tanggal_transaksi, keterangan) VALUES (?, ?, ?, ?, ?, ?)",
          [
            id_anggota || null,
            jenis_transaksi,
            jumlah,
            tipe,
            tanggal_transaksi || new Date(),
            keterangan,
          ],
        );

        return NextResponse.json({
          success: true,
          message: "Jurnal (legacy) berhasil ditambahkan",
          system: "old",
        });
      } else {
        // New path - post ke jurnal_umum + jurnal_detail
        const {
          tanggalJurnal,
          periode,
          deskripsi,
          tipeJurnal,
          idPengguna,
          idReferensi,
          lines,
        } = body;

        if (
          !tanggalJurnal ||
          !periode ||
          !deskripsi ||
          !lines ||
          lines.length === 0
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Missing required fields: tanggalJurnal, periode, deskripsi, lines",
            },
            { status: 400 },
          );
        }

        const jurnalId = await postJournalEntry(connection, {
          tanggalJurnal,
          periode,
          deskripsi,
          tipeJurnal: tipeJurnal || "manual",
          idPengguna: idPengguna || 1,
          idReferensi,
          lines,
        });

        return NextResponse.json({
          success: true,
          message: "Jurnal (modern) posted successfully",
          jurnalId,
          system: "new",
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("POST /api/jurnal error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
