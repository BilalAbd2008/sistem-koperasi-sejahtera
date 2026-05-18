import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/buku-besar (General Ledger by Account)
 * Query params:
 *   - akun: account name (for old system) or kodeRekening (for new system)
 *   - periode: YYYY-MM (for new system)
 *   - system: 'old' | 'new' | 'all' (default)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const akun = searchParams.get("akun");
    const periode = searchParams.get("periode");
    const system = searchParams.get("system") || "all";

    const connection = await pool.getConnection();

    try {
      let result: any = {
        system,
        old: null,
        new: null,
      };

      // Fetch from old system (transaksi_lain)
      if (system === "old" || system === "all") {
        let oldQuery = `
          SELECT 
            t.id, 
            t.tanggal_transaksi, 
            t.jenis_transaksi AS akun, 
            t.keterangan,
            t.id_anggota,
            a.nama as nama_anggota,
            CASE WHEN t.tipe = 'debit' THEN t.jumlah ELSE 0 END AS debit,
            CASE WHEN t.tipe = 'kredit' THEN t.jumlah ELSE 0 END AS kredit,
            SUM(CASE WHEN t.tipe = 'debit' THEN t.jumlah ELSE -t.jumlah END)
              OVER (PARTITION BY t.jenis_transaksi ORDER BY t.tanggal_transaksi, t.id) AS saldo
          FROM transaksi_lain t
          LEFT JOIN anggota a ON t.id_anggota = a.id
          WHERE 1=1
        `;
        const oldParams: unknown[] = [];

        if (akun) {
          oldQuery += " AND t.jenis_transaksi = ?";
          oldParams.push(akun);
        }

        oldQuery += " ORDER BY t.tanggal_transaksi ASC, t.id ASC";

        const [oldRows] = await connection.query(oldQuery, oldParams);
        result.old = oldRows;
      }

      // Fetch from new system (jurnal_detail)
      if (system === "new" || system === "all") {
        let newQuery = `
          SELECT 
            jd.id,
            jd.id_jurnal,
            ju.tanggal_jurnal,
            ju.nomor_jurnal,
            jd.kode_rekening,
            jd.posisi,
            jd.jumlah,
            jd.keterangan,
            jd.id_anggota,
            a.nama as nama_anggota,
            r.nama_rekening,
            CASE WHEN jd.posisi = 'debit' THEN jd.jumlah ELSE 0 END AS debit,
            CASE WHEN jd.posisi = 'kredit' THEN jd.jumlah ELSE 0 END AS kredit,
            SUM(CASE WHEN jd.posisi = 'debit' THEN jd.jumlah ELSE -jd.jumlah END)
              OVER (PARTITION BY jd.kode_rekening ORDER BY ju.tanggal_jurnal, ju.nomor_jurnal) AS saldo
          FROM jurnal_detail jd
          JOIN jurnal_umum ju ON jd.id_jurnal = ju.id
          LEFT JOIN anggota a ON jd.id_anggota = a.id
          LEFT JOIN rekening r ON jd.kode_rekening = r.kode_rekening
          WHERE ju.status_posting = 'posted'
        `;
        const newParams: any[] = [];

        if (akun) {
          newQuery += " AND jd.kode_rekening = ?";
          newParams.push(akun);
        }
        if (periode) {
          newQuery += " AND ju.periode = ?";
          newParams.push(periode);
        }

        newQuery += " ORDER BY ju.tanggal_jurnal ASC, ju.nomor_jurnal ASC";

        const [newRows] = await connection.query(newQuery, newParams);
        result.new = newRows;
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("GET /api/buku-besar error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
