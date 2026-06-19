import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

const RESET_CONFIRMATION = "RESET DATA";

type AuthorizedUserRow = RowDataPacket & {
  id: number;
};

const tablesToReset = [
  "saldo_rekening",
  "jurnal_detail",
  "jurnal_umum",
  "periode_akuntansi",
  "rekening",
  "password_reset_tokens",
  "pengumuman",
  "laporan_keuangan",
  "transaksi_lain",
  "shu_alokasi",
  "pembayaran_pinjaman",
  "pinjaman",
  "simpanan",
  "utang_toko",
  "anggota",
  "pengguna",
];

async function seedDefaultUsers(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
) {
  await connection.query(
    `INSERT INTO pengguna
      (username, password, nama_lengkap, email, role, status)
     VALUES
      ('bendahara', 'bend123', 'Bendahara Koperasi', 'bendahara@koperasi.local', 'bendahara', 'aktif')`,
  );
}

async function seedChartOfAccounts(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
) {
  await connection.query(
    `INSERT INTO rekening
      (kode_rekening, nama_rekening, deskripsi, kategori, tipe_normal, jenis_akun, parent_kode_rekening, status, tanggal_buat)
     VALUES
      ('1-0000', 'ASET', 'Aset Total', 'aset', 'debit', 'parent', NULL, 'aktif', CURDATE()),
      ('1-1000', 'Aset Lancar', 'Current Assets', 'aset', 'debit', 'parent', '1-0000', 'aktif', CURDATE()),
      ('1-1100', 'Kas', 'Kas di tangan', 'aset', 'debit', 'child', '1-1000', 'aktif', CURDATE()),
      ('1-1200', 'Bank', 'Rekening Bank', 'aset', 'debit', 'child', '1-1000', 'aktif', CURDATE()),
      ('1-1300', 'Piutang Pinjaman', 'Piutang dari anggota yang meminjam', 'aset', 'debit', 'child', '1-1000', 'aktif', CURDATE()),
      ('1-1400', 'Piutang Bunga', 'Bunga pinjaman yang masih piutang', 'aset', 'debit', 'child', '1-1000', 'aktif', CURDATE()),
      ('1-1500', 'Piutang Toko', 'Piutang barang/toko anggota', 'aset', 'debit', 'child', '1-1000', 'aktif', CURDATE()),
      ('1-2000', 'Aset Tetap', 'Fixed Assets', 'aset', 'debit', 'parent', '1-0000', 'aktif', CURDATE()),
      ('1-2100', 'Peralatan Kantor', 'Peralatan & furniture kantor', 'aset', 'debit', 'child', '1-2000', 'aktif', CURDATE()),
      ('1-2200', 'Akumulasi Penyusutan Peralatan', 'Accumulated Depreciation', 'aset', 'kredit', 'child', '1-2000', 'aktif', CURDATE()),
      ('2-0000', 'LIABILITAS', 'Liabilitas Total', 'liabilitas', 'kredit', 'parent', NULL, 'aktif', CURDATE()),
      ('2-1000', 'Simpanan Anggota', 'Kewajiban simpanan anggota', 'liabilitas', 'kredit', 'parent', '2-0000', 'aktif', CURDATE()),
      ('2-1100', 'Simpanan Wajib', 'Simpanan wajib', 'liabilitas', 'kredit', 'child', '2-1000', 'aktif', CURDATE()),
      ('2-1200', 'Simpanan Lebaran', 'Simpanan khusus lebaran', 'liabilitas', 'kredit', 'child', '2-1000', 'aktif', CURDATE()),
      ('2-1300', 'Simpanan Pendidikan', 'Simpanan untuk pendidikan', 'liabilitas', 'kredit', 'child', '2-1000', 'aktif', CURDATE()),
      ('2-1400', 'Simpanan Sukarela', 'Simpanan sukarela anggota', 'liabilitas', 'kredit', 'child', '2-1000', 'aktif', CURDATE()),
      ('2-2000', 'Utang Lain-lain', 'Liabilitas jangka panjang', 'liabilitas', 'kredit', 'child', '2-0000', 'aktif', CURDATE()),
      ('3-0000', 'MODAL', 'Modal Total', 'modal', 'kredit', 'parent', NULL, 'aktif', CURDATE()),
      ('3-1000', 'Modal Pemilik', 'Modal awal koperasi', 'modal', 'kredit', 'child', '3-0000', 'aktif', CURDATE()),
      ('3-2000', 'Laba Ditahan', 'Accumulated earnings', 'modal', 'kredit', 'child', '3-0000', 'aktif', CURDATE()),
      ('3-3000', 'Laba/Rugi Tahun Berjalan', 'Current year earnings', 'modal', 'kredit', 'child', '3-0000', 'aktif', CURDATE()),
      ('4-0000', 'PENDAPATAN', 'Pendapatan Total', 'pendapatan', 'kredit', 'parent', NULL, 'aktif', CURDATE()),
      ('4-1000', 'Pendapatan Bunga', 'Bunga dari pinjaman anggota', 'pendapatan', 'kredit', 'child', '4-0000', 'aktif', CURDATE()),
      ('4-2000', 'Pendapatan Lain-lain', 'Income dari sumber lain', 'pendapatan', 'kredit', 'child', '4-0000', 'aktif', CURDATE()),
      ('4-3000', 'Pendapatan Toko', 'Pendapatan dari transaksi toko anggota', 'pendapatan', 'kredit', 'child', '4-0000', 'aktif', CURDATE()),
      ('5-0000', 'BEBAN', 'Beban Total', 'beban', 'debit', 'parent', NULL, 'aktif', CURDATE()),
      ('5-1000', 'Beban Operasional', 'Operating expenses', 'beban', 'debit', 'parent', '5-0000', 'aktif', CURDATE()),
      ('5-1100', 'Gaji & Honorarium', 'Beban gaji staff', 'beban', 'debit', 'child', '5-1000', 'aktif', CURDATE()),
      ('5-1200', 'Biaya Administrasi', 'Administrative costs', 'beban', 'debit', 'child', '5-1000', 'aktif', CURDATE()),
      ('5-1300', 'Biaya Pemeliharaan', 'Maintenance costs', 'beban', 'debit', 'child', '5-1000', 'aktif', CURDATE()),
      ('5-1400', 'Penyusutan', 'Depreciation expense', 'beban', 'debit', 'child', '5-1000', 'aktif', CURDATE())`,
  );
}

async function seedAccountingPeriods(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
) {
  const currentYear = new Date().getFullYear();

  for (const year of [currentYear - 1, currentYear, currentYear + 1]) {
    for (let month = 1; month <= 12; month += 1) {
      const period = `${year}-${String(month).padStart(2, "0")}`;
      const start = `${period}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${period}-${String(lastDay).padStart(2, "0")}`;

      await connection.query(
        `INSERT INTO periode_akuntansi
          (periode, tanggal_mulai, tanggal_akhir, status)
         VALUES (?, ?, ?, 'draft')`,
        [period, start, end],
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const role = String(body.role || "");
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const confirmation = String(body.confirmation || "");

    if (role !== "bendahara") {
      return NextResponse.json(
        { success: false, error: "Tidak memiliki akses reset database" },
        { status: 403 },
      );
    }

    if (confirmation !== RESET_CONFIRMATION) {
      return NextResponse.json(
        { success: false, error: `Ketik ${RESET_CONFIRMATION} untuk konfirmasi` },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();

    try {
      const [users] = await connection.query<AuthorizedUserRow[]>(
        `SELECT id
         FROM pengguna
         WHERE username = ?
          AND password = ?
          AND role = 'bendahara'
          AND status = 'aktif'
         LIMIT 1`,
        [username, password],
      );

      if (users.length === 0) {
        return NextResponse.json(
          { success: false, error: "Username atau password tidak valid" },
          { status: 401 },
        );
      }

      await connection.query("SET FOREIGN_KEY_CHECKS = 0");

      for (const table of tablesToReset) {
        await connection.query(`TRUNCATE TABLE \`${table}\``);
      }

      await connection.query("SET FOREIGN_KEY_CHECKS = 1");

      await seedDefaultUsers(connection);
      await seedChartOfAccounts(connection);
      await seedAccountingPeriods(connection);

      return NextResponse.json({
        success: true,
        message: "Database berhasil direset dari nol",
      });
    } catch (error) {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Reset database error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal reset database" },
      { status: 500 },
    );
  }
}
