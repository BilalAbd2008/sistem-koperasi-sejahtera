import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const akun = searchParams.get("akun");

    const connection = await pool.getConnection();

    let query = `
      SELECT t.tanggal_transaksi, t.jenis_transaksi AS akun, t.keterangan,
             CASE WHEN t.tipe = 'debit' THEN t.jumlah ELSE 0 END AS debit,
             CASE WHEN t.tipe = 'kredit' THEN t.jumlah ELSE 0 END AS kredit,
             SUM(CASE WHEN t.tipe = 'debit' THEN t.jumlah ELSE -t.jumlah END)
               OVER (ORDER BY t.tanggal_transaksi, t.id) AS saldo
      FROM transaksi_lain t
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (akun) {
      query += " AND t.jenis_transaksi = ?";
      params.push(akun);
    }

    query += " ORDER BY t.tanggal_transaksi DESC, t.id DESC";

    const [rows] = await connection.query(query, params);
    connection.release();

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get buku besar error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
