-- EXTENSION: Sistem Akuntansi Lengkap (Jurnal Umum → Neraca Posisi)
-- Untuk Koperasi REPA

-- ============================================================================
-- 1. CHART OF ACCOUNTS (Daftar Rekening) - Hierarki Sederhana
-- ============================================================================
CREATE TABLE IF NOT EXISTS rekening (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kode_rekening VARCHAR(20) UNIQUE NOT NULL,
  nama_rekening VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  kategori ENUM('aset', 'liabilitas', 'modal', 'pendapatan', 'beban') NOT NULL,
  tipe_normal ENUM('debit', 'kredit') NOT NULL,
  jenis_akun ENUM('parent', 'child') NOT NULL DEFAULT 'child',
  parent_kode_rekening VARCHAR(20) NULL,
  status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
  tanggal_buat DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. PERIODE AKUNTANSI (Accounting Periods)
-- ============================================================================
CREATE TABLE IF NOT EXISTS periode_akuntansi (
  id INT PRIMARY KEY AUTO_INCREMENT,
  periode VARCHAR(7) UNIQUE NOT NULL, -- Format: YYYY-MM
  tanggal_mulai DATE NOT NULL,
  tanggal_akhir DATE NOT NULL,
  status ENUM('draft', 'closed') DEFAULT 'draft',
  deskripsi TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. JURNAL UMUM (General Journal - Header)
-- ============================================================================
CREATE TABLE IF NOT EXISTS jurnal_umum (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nomor_jurnal VARCHAR(20) UNIQUE NOT NULL, -- Auto-generated: JU-YYYYMMDD-001
  tanggal_jurnal DATE NOT NULL,
  periode VARCHAR(7) NOT NULL, -- YYYY-MM untuk reference ke periode_akuntansi
  deskripsi TEXT NOT NULL,
  tipe_jurnal ENUM('manual', 'simpanan', 'pinjaman', 'bunga', 'biaya', 'koreksi') DEFAULT 'manual',
  id_pengguna INT NOT NULL,
  id_referensi INT, -- FK ke simpanan/pinjaman/dll jika auto-generated
  status_posting ENUM('draft', 'posted', 'reversed') DEFAULT 'draft',
  total_debit DECIMAL(12, 2) DEFAULT 0,
  total_kredit DECIMAL(12, 2) DEFAULT 0,
  keterangan_posting TEXT,
  tanggal_posting DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_pengguna) REFERENCES pengguna(id),
  FOREIGN KEY (periode) REFERENCES periode_akuntansi(periode) ON DELETE RESTRICT
);

-- ============================================================================
-- 4. DETAIL JURNAL (Journal Line Items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS jurnal_detail (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_jurnal INT NOT NULL,
  kode_rekening VARCHAR(20) NOT NULL,
  posisi ENUM('debit', 'kredit') NOT NULL,
  jumlah DECIMAL(12, 2) NOT NULL,
  keterangan TEXT,
  id_anggota INT, -- Untuk tracking per-member
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_jurnal) REFERENCES jurnal_umum(id) ON DELETE CASCADE,
  FOREIGN KEY (kode_rekening) REFERENCES rekening(kode_rekening) ON DELETE RESTRICT,
  FOREIGN KEY (id_anggota) REFERENCES anggota(id) ON DELETE SET NULL
);

-- ============================================================================
-- 5. SALDO REKENING (Account Balances - Cache untuk performa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS saldo_rekening (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kode_rekening VARCHAR(20) NOT NULL,
  periode VARCHAR(7) NOT NULL,
  saldo_debit DECIMAL(12, 2) DEFAULT 0,
  saldo_kredit DECIMAL(12, 2) DEFAULT 0,
  saldo_akhir DECIMAL(12, 2) DEFAULT 0, -- (-) jika debit, (+) jika kredit
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rekening_periode (kode_rekening, periode),
  FOREIGN KEY (kode_rekening) REFERENCES rekening(kode_rekening),
  FOREIGN KEY (periode) REFERENCES periode_akuntansi(periode)
);

-- ============================================================================
-- 6. INDEXES untuk performa
-- ============================================================================
CREATE INDEX idx_rekening_kategori ON rekening(kategori);
CREATE INDEX idx_rekening_status ON rekening(status);
CREATE INDEX idx_jurnal_umum_tanggal ON jurnal_umum(tanggal_jurnal);
CREATE INDEX idx_jurnal_umum_periode ON jurnal_umum(periode);
CREATE INDEX idx_jurnal_umum_tipe ON jurnal_umum(tipe_jurnal);
CREATE INDEX idx_jurnal_umum_status ON jurnal_umum(status_posting);
CREATE INDEX idx_jurnal_detail_jurnal ON jurnal_detail(id_jurnal);
CREATE INDEX idx_jurnal_detail_rekening ON jurnal_detail(kode_rekening);
CREATE INDEX idx_jurnal_detail_anggota ON jurnal_detail(id_anggota);
CREATE INDEX idx_saldo_rekening_periode ON saldo_rekening(periode);

-- ============================================================================
-- 7. SEED DATA - Chart of Accounts untuk Koperasi
-- ============================================================================

-- ASET (Debit Normal)
INSERT IGNORE INTO rekening (kode_rekening, nama_rekening, deskripsi, kategori, tipe_normal, status, tanggal_buat) VALUES
('1-0000', 'ASET', 'Aset Total', 'aset', 'debit', 'aktif', CURDATE()),
('1-1000', 'Aset Lancar', 'Current Assets', 'aset', 'debit', 'aktif', CURDATE()),
('1-1100', 'Kas', 'Kas di tangan', 'aset', 'debit', 'aktif', CURDATE()),
('1-1200', 'Bank', 'Rekening Bank', 'aset', 'debit', 'aktif', CURDATE()),
('1-1300', 'Piutang Pinjaman', 'Piutang dari member yang meminjam', 'aset', 'debit', 'aktif', CURDATE()),
('1-1400', 'Piutang Bunga', 'Bunga pinjaman yang masih piutang', 'aset', 'debit', 'aktif', CURDATE()),
('1-1500', 'Piutang Toko', 'Piutang barang/toko anggota', 'aset', 'debit', 'aktif', CURDATE()),
('1-2000', 'Aset Tetap', 'Fixed Assets', 'aset', 'debit', 'aktif', CURDATE()),
('1-2100', 'Peralatan Kantor', 'Peralatan & furniture kantor', 'aset', 'debit', 'aktif', CURDATE()),
('1-2200', 'Akumulasi Penyusutan Peralatan', 'Accumulated Depreciation', 'aset', 'kredit', 'aktif', CURDATE());

-- LIABILITAS (Kredit Normal)
INSERT IGNORE INTO rekening (kode_rekening, nama_rekening, deskripsi, kategori, tipe_normal, status, tanggal_buat) VALUES
('2-0000', 'LIABILITAS', 'Liabilitas Total', 'liabilitas', 'kredit', 'aktif', CURDATE()),
('2-1000', 'Simpanan Anggota', 'Kewajiban simpanan member', 'liabilitas', 'kredit', 'aktif', CURDATE()),
('2-1100', 'Simpanan Wajib', 'Simpanan mandatory', 'liabilitas', 'kredit', 'aktif', CURDATE()),
('2-1200', 'Simpanan Lebaran', 'Simpanan khusus lebaran', 'liabilitas', 'kredit', 'aktif', CURDATE()),
('2-1300', 'Simpanan Pendidikan', 'Simpanan untuk pendidikan', 'liabilitas', 'kredit', 'aktif', CURDATE()),
('2-1400', 'Simpanan Sukarela', 'Simpanan sukarela anggota', 'liabilitas', 'kredit', 'aktif', CURDATE()),
('2-2000', 'Utang Lain-lain', 'Liabilitas jangka panjang', 'liabilitas', 'kredit', 'aktif', CURDATE());

-- MODAL (Kredit Normal)
INSERT IGNORE INTO rekening (kode_rekening, nama_rekening, deskripsi, kategori, tipe_normal, status, tanggal_buat) VALUES
('3-0000', 'MODAL', 'Modal Total', 'modal', 'kredit', 'aktif', CURDATE()),
('3-1000', 'Modal Pemilik', 'Modal awal koperasi', 'modal', 'kredit', 'aktif', CURDATE()),
('3-2000', 'Laba Ditahan', 'Accumulated earnings', 'modal', 'kredit', 'aktif', CURDATE()),
('3-3000', 'Laba/Rugi Tahun Berjalan', 'Current year earnings', 'modal', 'kredit', 'aktif', CURDATE());

-- PENDAPATAN (Kredit Normal)
INSERT IGNORE INTO rekening (kode_rekening, nama_rekening, deskripsi, kategori, tipe_normal, status, tanggal_buat) VALUES
('4-0000', 'PENDAPATAN', 'Pendapatan Total', 'pendapatan', 'kredit', 'aktif', CURDATE()),
('4-1000', 'Pendapatan Bunga', 'Bunga dari pinjaman member', 'pendapatan', 'kredit', 'aktif', CURDATE()),
('4-3000', 'Pendapatan Toko', 'Pendapatan dari transaksi toko anggota', 'pendapatan', 'kredit', 'aktif', CURDATE()),
('4-2000', 'Pendapatan Lain-lain', 'Income dari sumber lain', 'pendapatan', 'kredit', 'aktif', CURDATE());

-- BEBAN (Debit Normal)
INSERT IGNORE INTO rekening (kode_rekening, nama_rekening, deskripsi, kategori, tipe_normal, status, tanggal_buat) VALUES
('5-0000', 'BEBAN', 'Beban Total', 'beban', 'debit', 'aktif', CURDATE()),
('5-1000', 'Beban Operasional', 'Operating expenses', 'beban', 'debit', 'aktif', CURDATE()),
('5-1100', 'Gaji & Honorarium', 'Beban gaji staff', 'beban', 'debit', 'aktif', CURDATE()),
('5-1200', 'Biaya Administrasi', 'Administrative costs', 'beban', 'debit', 'aktif', CURDATE()),
('5-1300', 'Biaya Pemeliharaan', 'Maintenance costs', 'beban', 'debit', 'aktif', CURDATE()),
('5-1400', 'Penyusutan', 'Depreciation expense', 'beban', 'debit', 'aktif', CURDATE());

-- ============================================================================
-- 8. SEED DATA - Default Periode Akuntansi (tahun 2025)
-- ============================================================================
INSERT IGNORE INTO periode_akuntansi (periode, tanggal_mulai, tanggal_akhir, status) VALUES
('2025-01', '2025-01-01', '2025-01-31', 'draft'),
('2025-02', '2025-02-01', '2025-02-28', 'draft'),
('2025-03', '2025-03-01', '2025-03-31', 'draft'),
('2025-04', '2025-04-01', '2025-04-30', 'draft'),
('2025-05', '2025-05-01', '2025-05-31', 'draft'),
('2025-06', '2025-06-01', '2025-06-30', 'draft'),
('2025-07', '2025-07-01', '2025-07-31', 'draft'),
('2025-08', '2025-08-01', '2025-08-31', 'draft'),
('2025-09', '2025-09-01', '2025-09-30', 'draft'),
('2025-10', '2025-10-01', '2025-10-31', 'draft'),
('2025-11', '2025-11-01', '2025-11-30', 'draft'),
('2025-12', '2025-12-01', '2025-12-31', 'draft');
