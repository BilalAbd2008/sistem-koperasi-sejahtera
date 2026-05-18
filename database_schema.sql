-- Skema Database REPA (Rekening Simpanan Pinjam) Koperasi
-- Created for Laragon MySQL Database

-- 1. Tabel Anggota (Members)
CREATE TABLE IF NOT EXISTS anggota (
  id INT PRIMARY KEY AUTO_INCREMENT,
  no_anggota VARCHAR(20) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  no_telepon VARCHAR(15),
  alamat TEXT,
  status_pekerjaan VARCHAR(100),
  tanggal_bergabung DATE NOT NULL,
  status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Tabel Simpanan (Savings)
CREATE TABLE IF NOT EXISTS simpanan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_anggota INT NOT NULL,
  jenis_simpanan ENUM('wajib', 'lebaran', 'pendidikan', 'sukarela') NOT NULL,
  jumlah DECIMAL(12, 2) NOT NULL,
  tanggal_simpanan DATE NOT NULL,
  status ENUM('aktif', 'nonaktif', 'ditarik') DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_anggota) REFERENCES anggota(id) ON DELETE CASCADE
);

-- 3. Tabel Pinjaman (Loans)
CREATE TABLE IF NOT EXISTS pinjaman (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_anggota INT NOT NULL,
  jumlah_pinjam DECIMAL(12, 2) NOT NULL,
  jumlah_bunga DECIMAL(12, 2),
  jangka_waktu INT NOT NULL,
  tanggal_pinjam DATE NOT NULL,
  tanggal_mulai DATE NOT NULL,
  tanggal_tagih TINYINT NOT NULL DEFAULT 1,
  tanggal_jatuh_tempo DATE NOT NULL,
  status ENUM('aktif', 'lunas', 'bermasalah') DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_anggota) REFERENCES anggota(id) ON DELETE CASCADE
);

-- 4. Tabel Pembayaran Pinjaman (Loan Payments)
CREATE TABLE IF NOT EXISTS pembayaran_pinjaman (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_pinjaman INT NOT NULL,
  jumlah_bayar DECIMAL(12, 2) NOT NULL,
  tanggal_bayar DATE NOT NULL,
  keterangan VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pinjaman) REFERENCES pinjaman(id) ON DELETE CASCADE
);

-- 4b. Tabel Utang Toko (Store Debt)
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
);

-- 4c. Tabel Pengaturan Alokasi SHU
CREATE TABLE IF NOT EXISTS shu_alokasi (
  id INT PRIMARY KEY AUTO_INCREMENT,
  periode VARCHAR(7) NOT NULL,
  kode_alokasi VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  persentase DECIMAL(6, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_shu_alokasi_periode_kode (periode, kode_alokasi)
);

-- 5. Tabel Pengguna (Users - Admin/Bendahara/Pengurus)
CREATE TABLE IF NOT EXISTS pengguna (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nama_lengkap VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  role ENUM('admin', 'bendahara', 'pengurus', 'anggota') DEFAULT 'anggota',
  status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Tabel Laporan Keuangan (Financial Reports)
CREATE TABLE IF NOT EXISTS laporan_keuangan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  periode_awal DATE NOT NULL,
  periode_akhir DATE NOT NULL,
  total_simpanan DECIMAL(12, 2),
  total_pinjaman DECIMAL(12, 2),
  total_bunga_pinjaman DECIMAL(12, 2),
  total_biaya DECIMAL(12, 2),
  total_laba_rugi DECIMAL(12, 2),
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. Tabel Transaksi Lain (Other Transactions)
CREATE TABLE IF NOT EXISTS transaksi_lain (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_anggota INT,
  jenis_transaksi VARCHAR(100) NOT NULL,
  jumlah DECIMAL(12, 2) NOT NULL,
  tipe ENUM('debit', 'kredit') NOT NULL,
  tanggal_transaksi DATE NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_anggota) REFERENCES anggota(id) ON DELETE SET NULL
);

-- 8. Tabel Pengaturan Sistem (System Settings)
CREATE TABLE IF NOT EXISTS pengaturan_sistem (
  id INT PRIMARY KEY AUTO_INCREMENT,
  key_setting VARCHAR(100) UNIQUE NOT NULL,
  value_setting TEXT,
  deskripsi VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 9. Tabel Pengumuman (Announcements)
CREATE TABLE IF NOT EXISTS pengumuman (
  id INT PRIMARY KEY AUTO_INCREMENT,
  judul VARCHAR(150) NOT NULL,
  isi TEXT NOT NULL,
  tanggal_pengumuman DATE NOT NULL,
  target_role ENUM('all', 'anggota', 'bendahara', 'pengurus') DEFAULT 'all',
  status ENUM('aktif', 'arsip') DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 10. Tabel Reset Password Token
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES pengguna(id) ON DELETE CASCADE
);

-- Indexes untuk performa
CREATE INDEX idx_anggota_status ON anggota(status);
CREATE INDEX idx_simpanan_anggota ON simpanan(id_anggota);
CREATE INDEX idx_simpanan_tanggal ON simpanan(tanggal_simpanan);
CREATE INDEX idx_pinjaman_anggota ON pinjaman(id_anggota);
CREATE INDEX idx_pinjaman_status ON pinjaman(status);
CREATE INDEX idx_pembayaran_pinjaman ON pembayaran_pinjaman(id_pinjaman);
CREATE INDEX idx_utang_toko_anggota ON utang_toko(id_anggota);
CREATE INDEX idx_utang_toko_bulan ON utang_toko(bulan);
CREATE INDEX idx_shu_alokasi_periode ON shu_alokasi(periode);
CREATE INDEX idx_pengguna_role ON pengguna(role);
CREATE INDEX idx_transaksi_anggota ON transaksi_lain(id_anggota);
CREATE INDEX idx_pengumuman_tanggal ON pengumuman(tanggal_pengumuman);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);
