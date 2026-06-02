import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureLoanPaymentApprovalColumns } from "@/lib/loanAutomation";
import type { RowDataPacket } from "mysql2/promise";

type TotalRow = RowDataPacket & {
  total: number | string | null;
};

type RecentTransactionRow = RowDataPacket & {
  label: string;
  date: string | Date;
  amount: number | string;
  tone: string;
};

type AnnouncementRow = RowDataPacket & {
  judul: string;
  isi: string;
  tanggal_pengumuman: string | Date;
};

export async function GET(request: NextRequest) {
  try {
    const idAnggota = request.nextUrl.searchParams.get("id_anggota");
    if (!idAnggota) {
      return NextResponse.json(
        { error: "id_anggota wajib diisi" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();
    await ensureLoanPaymentApprovalColumns(connection);

    const [totalSimpanan] = await connection.query<TotalRow[]>(
      'SELECT COALESCE(SUM(jumlah), 0) AS total FROM simpanan WHERE status = "aktif" AND id_anggota = ?',
      [idAnggota],
    );
    const [totalPinjaman] = await connection.query<TotalRow[]>(
      'SELECT COALESCE(SUM(jumlah_pinjam), 0) AS total FROM pinjaman WHERE status = "aktif" AND id_anggota = ?',
      [idAnggota],
    );
    const [sisaPinjaman] = await connection.query<TotalRow[]>(
      'SELECT COALESCE(SUM(p.jumlah_pinjam - COALESCE((SELECT SUM(pp.jumlah_bayar) FROM pembayaran_pinjaman pp WHERE pp.id_pinjaman = p.id AND pp.status_approval = "approved"), 0)), 0) AS total FROM pinjaman p WHERE p.status = "aktif" AND p.id_anggota = ?',
      [idAnggota],
    );
    const [angsuranBerikut] = await connection.query<TotalRow[]>(
      `SELECT COALESCE(SUM(pp.jumlah_bayar), 0) AS total
       FROM pembayaran_pinjaman pp
       JOIN pinjaman p ON p.id = pp.id_pinjaman
       WHERE p.id_anggota = ? AND pp.status_approval = 'pending'
         AND pp.tanggal_bayar = (
           SELECT MIN(pp2.tanggal_bayar)
           FROM pembayaran_pinjaman pp2
           JOIN pinjaman p2 ON p2.id = pp2.id_pinjaman
           WHERE p2.id_anggota = ? AND pp2.status_approval = 'pending'
         )`,
      [idAnggota, idAnggota],
    );

    const [recentSimpanan] = await connection.query<RecentTransactionRow[]>(
      `SELECT 'Setoran Simpanan' AS label, tanggal_simpanan AS date, jumlah AS amount, 'emerald' AS tone
       FROM simpanan
       WHERE id_anggota = ?
       ORDER BY tanggal_simpanan DESC
       LIMIT 2`,
      [idAnggota],
    );
    const [recentPembayaran] = await connection.query<RecentTransactionRow[]>(
      `SELECT 'Angsuran Pinjaman' AS label, tanggal_bayar AS date, jumlah_bayar AS amount, 'amber' AS tone
       FROM pembayaran_pinjaman pp
       JOIN pinjaman p ON p.id = pp.id_pinjaman
       WHERE p.id_anggota = ? AND pp.status_approval = 'approved'
       ORDER BY tanggal_bayar DESC
       LIMIT 2`,
      [idAnggota],
    );

    const [announcementsDb] = await connection.query<AnnouncementRow[]>(
      `SELECT judul, isi, tanggal_pengumuman
       FROM pengumuman
       WHERE status = 'aktif' AND (target_role = 'all' OR target_role = 'anggota')
       ORDER BY tanggal_pengumuman DESC
       LIMIT 5`,
    );

    connection.release();

    const formatCurrency = (value: unknown) =>
      `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

    return NextResponse.json({
      success: true,
      data: {
        summary: [
          {
            title: "Total Simpanan",
            value: formatCurrency(totalSimpanan[0]?.total),
            subtitle: "Lihat Detail",
            tone: "from-emerald-50 to-emerald-100 text-emerald-700",
          },
          {
            title: "Total Pinjaman",
            value: formatCurrency(totalPinjaman[0]?.total),
            subtitle: "Lihat Detail",
            tone: "from-sky-50 to-sky-100 text-sky-700",
          },
          {
            title: "Sisa Pinjaman",
            value: formatCurrency(sisaPinjaman[0]?.total),
            subtitle: "Lihat Detail",
            tone: "from-amber-50 to-amber-100 text-amber-700",
          },
          {
            title: "Angsuran Berikutnya",
            value: formatCurrency(angsuranBerikut[0]?.total),
            subtitle: "15 Jun 2026",
            tone: "from-violet-50 to-violet-100 text-violet-700",
          },
        ],
        recentTransactions: [
          ...recentSimpanan,
          ...recentPembayaran,
        ].slice(0, 4),
        announcements: announcementsDb.map((item, index) => ({
          title: item.judul,
          date: new Date(item.tanggal_pengumuman).toLocaleDateString("id-ID"),
          description: item.isi,
          tone:
            index % 3 === 0
              ? "text-amber-600"
              : index % 3 === 1
                ? "text-emerald-600"
                : "text-sky-600",
        })),
      },
    });
  } catch (error) {
    console.error("Get member dashboard error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
