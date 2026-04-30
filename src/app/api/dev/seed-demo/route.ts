import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST() {
  try {
    const connection = await pool.getConnection();

    const getCount = async (table: string) => {
      const [rows] = await connection.query(
        `SELECT COUNT(*) AS total FROM ${table}`,
      );
      return (rows as Array<{ total: number }>)[0]?.total || 0;
    };

    const totalAnggota = await getCount("anggota");
    const totalSimpanan = await getCount("simpanan");
    const totalPinjaman = await getCount("pinjaman");
    const totalPembayaran = await getCount("pembayaran_pinjaman");
    const totalTransaksi = await getCount("transaksi_lain");
    const totalLaporan = await getCount("laporan_keuangan");

    if (
      totalAnggota ||
      totalSimpanan ||
      totalPinjaman ||
      totalPembayaran ||
      totalTransaksi ||
      totalLaporan
    ) {
      connection.release();
      return NextResponse.json({
        success: true,
        message: "Data simulasi sudah ada, seeding dilewati",
      });
    }

    await connection.query(
      `INSERT IGNORE INTO pengguna (username, password, nama_lengkap, email, role, status) VALUES
       ('admin', 'admin123', 'Administrator', 'admin@koperasi.local', 'admin', 'aktif'),
       ('bendahara', 'bend123', 'Bendahara Koperasi', 'bendahara@koperasi.local', 'bendahara', 'aktif'),
       ('pengurus', 'pengurus123', 'Pengurus Koperasi', 'pengurus@koperasi.local', 'pengurus', 'aktif'),
       ('anggota1', 'anggota123', 'Andi Setiawan', 'andi@koperasi.local', 'anggota', 'aktif')`,
    );

    await connection.query(
      `INSERT INTO anggota (no_anggota, nama, email, no_telepon, alamat, tanggal_bergabung, status) VALUES
       ('A001', 'Andi Setiawan', 'andi@koperasi.local', '081234567890', 'Jl. Merdeka No. 10', '2025-01-05', 'aktif'),
       ('A002', 'Dewi Lestari', 'dewi@koperasi.local', '081234567891', 'Jl. Melati No. 5', '2025-02-10', 'aktif'),
       ('A003', 'Rudi Hermawan', 'rudi@koperasi.local', '081234567892', 'Jl. Mawar No. 20', '2025-03-12', 'aktif'),
       ('A004', 'Yuliana Putri', 'yuliana@koperasi.local', '081234567893', 'Jl. Anggrek No. 8', '2025-04-15', 'aktif'),
       ('A005', 'Budi Santoso', 'budi@koperasi.local', '081234567894', 'Jl. Kenanga No. 15', '2025-05-20', 'aktif')`,
    );

    const [memberRows] = await connection.query(
      `SELECT id, no_anggota FROM anggota WHERE no_anggota IN ('A001', 'A002', 'A003', 'A004', 'A005')`,
    );
    const members = memberRows as Array<{ id: number; no_anggota: string }>;
    const memberId = (noAnggota: string) =>
      members.find((item) => item.no_anggota === noAnggota)?.id;

    await connection.query(
      `INSERT INTO simpanan (id_anggota, jenis_simpanan, jumlah, tanggal_simpanan, status) VALUES
       (?, 'wajib', 100000, '2025-05-01', 'aktif'),
       (?, 'pokok', 200000, '2025-04-01', 'aktif'),
       (?, 'sukarela', 150000, '2025-03-20', 'aktif'),
       (?, 'wajib', 100000, '2025-02-10', 'aktif'),
       (?, 'wajib', 100000, '2025-01-08', 'aktif')`,
      [
        memberId("A001"),
        memberId("A002"),
        memberId("A003"),
        memberId("A004"),
        memberId("A005"),
      ],
    );

    const dueDate = new Date("2026-06-15");
    await connection.query(
      `INSERT INTO pinjaman (id_anggota, jumlah_pinjam, jumlah_bunga, jangka_waktu, tanggal_pinjam, tanggal_jatuh_tempo, status) VALUES
       (?, 10000000, 1200000, 12, '2025-01-15', ?, 'aktif'),
       (?, 8000000, 900000, 12, '2025-04-10', ?, 'aktif')`,
      [memberId("A001"), dueDate, memberId("A002"), dueDate],
    );

    const [loanRows] = await connection.query(
      `SELECT id, id_anggota FROM pinjaman WHERE id_anggota IN (${[memberId("A001"), memberId("A002")].map(() => "?").join(",")})`,
      [memberId("A001"), memberId("A002")],
    );
    const loans = loanRows as Array<{ id: number; id_anggota: number }>;
    const loanId = (member: number | undefined) =>
      loans.find((item) => item.id_anggota === member)?.id;

    await connection.query(
      `INSERT INTO pembayaran_pinjaman (id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan) VALUES
       (?, 850000, '2025-05-10', 'Angsuran ke-5'),
       (?, 750000, '2025-04-10', 'Angsuran ke-4'),
       (?, 950000, '2025-03-10', 'Angsuran ke-3')`,
      [
        loanId(memberId("A001")),
        loanId(memberId("A001")),
        loanId(memberId("A002")),
      ],
    );

    await connection.query(
      `INSERT INTO transaksi_lain (id_anggota, jenis_transaksi, jumlah, tipe, tanggal_transaksi, keterangan) VALUES
       (?, 'Setoran Simpanan Wajib', 100000, 'debit', '2025-05-01', 'Setoran Mei 2025'),
       (?, 'Angsuran Pinjaman', 850000, 'kredit', '2025-05-10', 'Angsuran ke-5'),
       (?, 'Setoran Simpanan Pokok', 200000, 'debit', '2025-04-01', 'Setoran Pokok')`,
      [memberId("A001"), memberId("A001"), memberId("A002")],
    );

    await connection.query(
      `INSERT INTO laporan_keuangan (periode_awal, periode_akhir, total_simpanan, total_pinjaman, total_bunga_pinjaman, total_biaya, total_laba_rugi, keterangan) VALUES
       ('2025-01-01', '2025-12-31', 76250000, 45000000, 12500000, 4500000, 8000000, 'Laporan simulasi tahun 2025')`,
    );

    connection.release();

    return NextResponse.json({
      success: true,
      message: "Data simulasi berhasil dimasukkan ke backend",
    });
  } catch (error) {
    console.error("Seed demo error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
