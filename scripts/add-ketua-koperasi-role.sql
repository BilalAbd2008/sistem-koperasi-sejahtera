-- Jalankan pada database existing agar role ketua koperasi bisa disimpan.
ALTER TABLE pengguna
  MODIFY role ENUM('admin', 'bendahara', 'ketua_koperasi', 'pengurus', 'anggota')
  DEFAULT 'anggota';

INSERT IGNORE INTO pengguna (username, password, nama_lengkap, email, role, status)
VALUES ('ketua', 'ketua123', 'Ketua Koperasi', 'ketua@example.com', 'ketua_koperasi', 'aktif');
