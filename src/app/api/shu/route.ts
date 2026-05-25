import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

const defaultAllocations = [
  { key: "cadangan", label: "Cadangan", percent: 40 },
  { key: "jasaModal", label: "Jasa Modal", percent: 20 },
  { key: "jasaUsaha", label: "Jasa Usaha", percent: 25 },
  { key: "pengurus", label: "Pengurus", percent: 10 },
  { key: "sosial", label: "Sosial", percent: 5 },
];

type IncomeStatementRow = RowDataPacket & {
  kategori: "pendapatan" | "beban";
  tipeNormal: "debit" | "kredit";
  totalDebit: number | string | null;
  totalKredit: number | string | null;
};

let shuMigrationPromise: Promise<void> | null = null;

async function ensureShuTables(connection: PoolConnection) {
  if (!shuMigrationPromise) {
    shuMigrationPromise = (async () => {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS shu_alokasi (
          id INT PRIMARY KEY AUTO_INCREMENT,
          periode VARCHAR(7) NOT NULL,
          kode_alokasi VARCHAR(50) NOT NULL,
          label VARCHAR(100) NOT NULL,
          persentase DECIMAL(6, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_shu_alokasi_periode_kode (periode, kode_alokasi)
        )
      `);

      await connection.query(
        "CREATE INDEX idx_shu_alokasi_periode ON shu_alokasi(periode)",
      ).catch(() => undefined);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS utang_toko (
          id INT PRIMARY KEY AUTO_INCREMENT,
          id_anggota INT NOT NULL,
          bulan VARCHAR(7) NOT NULL,
          jumlah DECIMAL(12, 2) NOT NULL,
          status ENUM('aktif', 'lunas', 'batal') DEFAULT 'aktif',
          tanggal_input DATE NOT NULL,
          keterangan TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (id_anggota) REFERENCES anggota(id) ON DELETE CASCADE
        )
      `);
    })();
  }

  await shuMigrationPromise;
}

const getPeriodBounds = (periode: string) => {
  const [year, month] = periode.split("-").map(Number);
  const start = `${year}-01-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { start, end };
};

async function ensurePeriodAllocations(connection: PoolConnection, periode: string) {
  for (const item of defaultAllocations) {
    await connection.query(
      `INSERT IGNORE INTO shu_alokasi
        (periode, kode_alokasi, label, persentase)
       VALUES (?, ?, ?, ?)`,
      [periode, item.key, item.label, item.percent],
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const periode =
      request.nextUrl.searchParams.get("periode") ||
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const bounds = getPeriodBounds(periode);
    const start = request.nextUrl.searchParams.get("startDate") || bounds.start;
    const end = request.nextUrl.searchParams.get("endDate") || bounds.end;

    const connection = await pool.getConnection();
    try {
      await ensureShuTables(connection);
      await ensurePeriodAllocations(connection, periode);

      const [allocationRows] = await connection.query<RowDataPacket[]>(
        `SELECT kode_alokasi, label, persentase
         FROM shu_alokasi
         WHERE periode = ?
         ORDER BY FIELD(kode_alokasi, 'cadangan', 'jasaModal', 'jasaUsaha', 'pengurus', 'sosial'), kode_alokasi`,
        [periode],
      );

      const [incomeRows] = await connection.query<IncomeStatementRow[]>(
        `SELECT
          r.kategori,
          r.tipe_normal AS tipeNormal,
          COALESCE(SUM(CASE WHEN ju.id IS NOT NULL AND jd.posisi = 'debit' THEN jd.jumlah ELSE 0 END), 0) AS totalDebit,
          COALESCE(SUM(CASE WHEN ju.id IS NOT NULL AND jd.posisi = 'kredit' THEN jd.jumlah ELSE 0 END), 0) AS totalKredit
        FROM rekening r
        LEFT JOIN jurnal_detail jd ON jd.kode_rekening = r.kode_rekening
        LEFT JOIN jurnal_umum ju
          ON ju.id = jd.id_jurnal
          AND ju.status_posting = 'posted'
          AND DATE(ju.tanggal_jurnal) BETWEEN ? AND ?
        WHERE r.status = 'aktif'
          AND r.kategori IN ('pendapatan', 'beban')
        GROUP BY r.kode_rekening, r.kategori, r.tipe_normal`,
        [start, end],
      );

      const incomeStatementRows = incomeRows.map((row) => {
        const totalDebit = Number(row.totalDebit || 0);
        const totalKredit = Number(row.totalKredit || 0);
        const amount =
          row.tipeNormal === "kredit"
            ? totalKredit - totalDebit
            : totalDebit - totalKredit;

        return {
          kategori: row.kategori,
          amount: Math.max(amount, 0),
        };
      });
      const totalRevenues = incomeStatementRows
        .filter((row) => row.kategori === "pendapatan")
        .reduce((sum, row) => sum + row.amount, 0);
      const totalExpenses = incomeStatementRows
        .filter((row) => row.kategori === "beban")
        .reduce((sum, row) => sum + row.amount, 0);
      const totalShu = totalRevenues - totalExpenses;

      const [memberRows] = await connection.query<RowDataPacket[]>(
        `SELECT
          a.id AS id_anggota,
          a.no_anggota,
          a.nama,
          COALESCE(s.total_simpanan, 0) AS simpanan,
          COALESCE(p.total_pinjaman, 0) AS pinjaman,
          COALESCE(ut.total_utang_toko, 0) AS utang_toko
        FROM anggota a
        LEFT JOIN (
          SELECT id_anggota, SUM(jumlah) AS total_simpanan
          FROM simpanan
          WHERE status = 'aktif' AND tanggal_simpanan <= ?
          GROUP BY id_anggota
        ) s ON s.id_anggota = a.id
        LEFT JOIN (
          SELECT id_anggota, SUM(jumlah_pinjam) AS total_pinjaman
          FROM pinjaman
          WHERE tanggal_pinjam >= ? AND tanggal_pinjam <= ?
          GROUP BY id_anggota
        ) p ON p.id_anggota = a.id
        LEFT JOIN (
          SELECT id_anggota, SUM(jumlah) AS total_utang_toko
          FROM utang_toko
          WHERE status = 'aktif' AND CONCAT(bulan, '-01') >= ? AND CONCAT(bulan, '-01') <= ?
          GROUP BY id_anggota
        ) ut ON ut.id_anggota = a.id
        WHERE a.status = 'aktif'
        ORDER BY a.no_anggota`,
        [end, start, end, start, end],
      );

      const allocations = allocationRows.map((row) => ({
        key: String(row.kode_alokasi),
        label: String(row.label),
        percent: Number(row.persentase || 0),
      }));
      const jasaModalPercent =
        allocations.find((item) => item.key === "jasaModal")?.percent || 0;
      const jasaUsahaPercent =
        allocations.find((item) => item.key === "jasaUsaha")?.percent || 0;
      const jasaModalPool = (totalShu * jasaModalPercent) / 100;
      const jasaUsahaPool = (totalShu * jasaUsahaPercent) / 100;
      const totalSimpanan = memberRows.reduce(
        (sum, row) => sum + Number(row.simpanan || 0),
        0,
      );
      const totalPartisipasi = memberRows.reduce(
        (sum, row) =>
          sum + Number(row.pinjaman || 0) + Number(row.utang_toko || 0),
        0,
      );

      const members = memberRows.map((row) => {
        const simpanan = Number(row.simpanan || 0);
        const pinjaman = Number(row.pinjaman || 0);
        const utangToko = Number(row.utang_toko || 0);
        const partisipasi = pinjaman + utangToko;
        const jasaModal =
          totalSimpanan > 0 ? (simpanan / totalSimpanan) * jasaModalPool : 0;
        const jasaUsaha =
          totalPartisipasi > 0
            ? (partisipasi / totalPartisipasi) * jasaUsahaPool
            : 0;

        return {
          idAnggota: Number(row.id_anggota),
          noAnggota: String(row.no_anggota),
          nama: String(row.nama),
          simpanan,
          pinjaman,
          utangToko,
          partisipasi,
          jasaModal,
          jasaUsaha,
          totalShu: jasaModal + jasaUsaha,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          periode,
          periodStart: start,
          periodEnd: end,
          totalRevenues,
          totalExpenses,
          totalShu,
          totalSimpanan,
          totalPartisipasi,
          allocations,
          pools: {
            jasaModal: jasaModalPool,
            jasaUsaha: jasaUsahaPool,
          },
          members,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Get SHU error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { periode, allocations } = await request.json();

    if (!periode || !Array.isArray(allocations)) {
      return NextResponse.json(
        { success: false, error: "Periode dan alokasi wajib diisi" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();
    try {
      await ensureShuTables(connection);

      for (const item of allocations) {
        await connection.query(
          `INSERT INTO shu_alokasi
            (periode, kode_alokasi, label, persentase)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            label = VALUES(label),
            persentase = VALUES(persentase)`,
          [
            periode,
            String(item.key),
            String(item.label),
            Number(item.percent || 0),
          ],
        );
      }

      return NextResponse.json({
        success: true,
        message: "Alokasi SHU berhasil disimpan",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Update SHU allocation error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
