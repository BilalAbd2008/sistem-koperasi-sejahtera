import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getTrialBalance } from "@/lib/accounting";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const periode = request.nextUrl.searchParams.get("periode");
    let periodeAwal = request.nextUrl.searchParams.get("periode_awal");
    let periodeAkhir = request.nextUrl.searchParams.get("periode_akhir");
    const system = request.nextUrl.searchParams.get("system") || "old";

    if (!periode && (!periodeAwal || !periodeAkhir)) {
      return NextResponse.json(
        { success: false, error: "Parameter tahun/periode diperlukan" },
        { status: 400 },
      );
    }

    if (periode && (!periodeAwal || !periodeAkhir)) {
      periodeAwal = `${periode}-01`;
      const [yearValue, monthValue] = periode.split("-").map(Number);
      const lastDay = new Date(yearValue, monthValue, 0).getDate();
      periodeAkhir = `${yearValue}-${String(monthValue).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }

    if (!periodeAwal || !periodeAkhir) {
      return NextResponse.json(
        { success: false, error: "Tanggal awal dan akhir periode diperlukan" },
        { status: 400 },
      );
    }

    const periodeLabel = periode || `${periodeAwal} s/d ${periodeAkhir}`;

    const connection = await pool.getConnection();

    try {
      const [tableRows] = await connection.query(
        "SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'rekening'",
      );
      const hasModernAccounting =
        Number((tableRows as Array<{ tableCount: number }>)[0]?.tableCount || 0) > 0;

      if (system === "new" && hasModernAccounting && periode) {
        const data = await getTrialBalance(connection, periode);

        return NextResponse.json({
          success: true,
          data,
          periode: periodeLabel,
          source: "rekening",
        });
      }

      const [rows] = await connection.query(
        `SELECT
          jenis_transaksi AS namaRekening,
          SUM(CASE WHEN tipe = 'debit' THEN jumlah ELSE 0 END) AS saldoDebit,
          SUM(CASE WHEN tipe = 'kredit' THEN jumlah ELSE 0 END) AS saldoKredit
        FROM transaksi_lain
        WHERE tanggal_transaksi BETWEEN ? AND ?
        GROUP BY jenis_transaksi
        ORDER BY jenis_transaksi`,
        [periodeAwal, periodeAkhir],
      );

      const data = (rows as Array<{
        namaRekening: string;
        saldoDebit: number | string | null;
        saldoKredit: number | string | null;
      }>).map((row, index) => ({
        kodeRekening: `SP-${String(index + 1).padStart(3, "0")}`,
        namaRekening: row.namaRekening,
        kategori: "simpan pinjam",
        saldoDebit: Number(row.saldoDebit || 0),
        saldoKredit: Number(row.saldoKredit || 0),
      }));

      return NextResponse.json({
        success: true,
        data,
        periode: periodeLabel,
        source: "transaksi_lain",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("GET /api/laporan-keuangan/trial-balance error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
