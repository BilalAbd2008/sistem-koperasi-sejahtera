# 📊 REPA Koperasi - Panduan Lengkap Alur Sistem

## 🎯 Ringkasan Sistem

REPA Koperasi adalah sistem informasi berbasis web untuk mengelola transaksi koperasi simpanan pinjam. Sistem ini terdiri dari:

- **Frontend**: Antarmuka pengguna yang responsif dan user-friendly
- **Backend API**: REST API untuk semua operasi database
- **Database MySQL**: Penyimpanan data terstruktur
- **Authentication**: Login-based access control

---

## 🔄 Alur Utama Aplikasi

### 1️⃣ **ALUR LOGIN**

```
┌─────────────┐
│ User Buka   │
│ localhost:3000
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Halaman Login       │
│ Input: Username     │
│ Input: Password     │
└──────┬──────────────┘
       │
       ▼ Form Submit
┌──────────────────────────┐
│ POST /api/auth/login     │
│ Body: {username, passwd} │
└──────┬───────────────────┘
       │
       ▼
┌───────────────────────────────────┐
│ Backend:                           │
│ 1. Query tabel: pengguna          │
│ 2. Cari row dengan username       │
│ 3. Validasi password              │
│ 4. Return user data               │
└──────┬────────────────────────────┘
       │
       ├───── Success─────┐
       │                  │
       │                  ▼
       │         ┌───────────────────────┐
       │         │ localStorage.setItem  │
       │         │ ('user', userData)    │
       │         └────────┬──────────────┘
       │                  │
       │                  ▼
       │         ┌───────────────────────┐
       │         │ Redirect ke Dashboard │
       │         │ /dashboard            │
       │         └───────────────────────┘
       │
       └─────Gagal──────────┐
                            │
                            ▼
                  ┌──────────────────────┐
                  │ Tampil Error Message  │
                  │ "Username atau       │
                  │  password salah"     │
                  └──────────────────────┘
```

**Database Query**:
```sql
SELECT * FROM pengguna 
WHERE username = 'admin' AND status = 'aktif'
```

**Tabel yang digunakan**: `pengguna`

---

### 2️⃣ **ALUR DASHBOARD**

```
┌─────────────────────┐
│ User Login Success  │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────┐
│ Component Mount      │
│ useEffect dipanggil  │
└──────┬───────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ fetch('/api/dashboard/stats')       │
│ GET Request                         │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ Backend: Jalankan 4 Query Paralel:    │
│                                        │
│ 1. SELECT COUNT(*) FROM anggota       │
│    WHERE status='aktif'               │
│    → totalMembers                     │
│                                        │
│ 2. SELECT SUM(jumlah) FROM simpanan   │
│    WHERE status='aktif'               │
│    → totalSavings                     │
│                                        │
│ 3. SELECT SUM(jumlah_pinjam)          │
│    FROM pinjaman                      │
│    WHERE status='aktif'               │
│    → totalLoans                       │
│                                        │
│ 4. SELECT SUM(jumlah_bunga)           │
│    FROM pinjaman                      │
│    → totalInterest                    │
└──────┬─────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Return Response:                 │
│ {                                │
│   totalMembers: 45,              │
│   totalSavings: 500000000,       │
│   totalLoans: 300000000,         │
│   totalInterest: 50000000        │
│ }                                │
└──────┬───────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Render 4 Cards:        │
│ ├─ Total Anggota      │
│ ├─ Total Simpanan     │
│ ├─ Total Pinjaman     │
│ └─ Total Bunga        │
│                        │
│ + Quick Access Links   │
└─────────────────────────┘
```

**Tabel yang digunakan**: `anggota`, `simpanan`, `pinjaman`

---

### 3️⃣ **ALUR MANAJEMEN ANGGOTA**

```
┌──────────────────┐
│ User Klik Menu   │
│ "Anggota"        │
└────┬─────────────┘
     │
     ▼
┌─────────────────────────┐
│ Navigate ke /anggota    │
└────┬────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Component Mount                 │
│ fetch('/api/anggota')           │
│ GET Request                     │
└────┬────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Backend Query:                  │
│ SELECT * FROM anggota           │
│ ORDER BY tanggal_bergabung DESC │
└────┬────────────────────────────┘
     │
     ▼
┌──────────────────────────────┐
│ Tampil Tabel Anggota        │
│ dengan kolom:               │
│ - No Anggota               │
│ - Nama                     │
│ - Email                    │
│ - No Telepon               │
│ - Tanggal Bergabung        │
│ - Status                   │
└──────┬───────────────────────┘
     │
     ▼ User Klik "+ Tambah Anggota"
┌──────────────────────────────┐
│ Form Input Muncul            │
│ Fields:                      │
│ - Nama                      │
│ - Email                     │
│ - No Telepon                │
│ - Alamat                    │
└──────┬───────────────────────┘
     │
     ▼ User Submit Form
┌────────────────────────────────┐
│ POST /api/anggota             │
│ Body: {                        │
│   nama,                        │
│   email,                       │
│   no_telepon,                 │
│   alamat                      │
│ }                              │
└────┬─────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ Backend:                            │
│ 1. Generate no_anggota otomatis:   │
│    Format: AGT-{timestamp}          │
│                                     │
│ 2. INSERT INTO anggota              │
│    (no_anggota, nama, email,        │
│     no_telepon, alamat,             │
│     tanggal_bergabung, status)      │
│    VALUES (...)                     │
│                                     │
│ 3. Return success response          │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ Frontend:               │
│ 1. Tampil Success Toast │
│ 2. Reset Form          │
│ 3. Fetch Ulang Data    │
│ 4. Refresh Table       │
└─────────────────────────┘
```

**Database Queries**:
```sql
-- Fetch Data
SELECT * FROM anggota ORDER BY tanggal_bergabung DESC

-- Insert Data
INSERT INTO anggota (no_anggota, nama, email, no_telepon, alamat, tanggal_bergabung)
VALUES ('AGT-1234567890', 'Nama Anggota', 'email@koperasi.local', '081234567890', 'Alamat', NOW())
```

**Tabel yang digunakan**: `anggota`

---

### 4️⃣ **ALUR SIMPANAN**

```
┌──────────────────┐
│ User Klik Menu   │
│ "Simpanan"       │
└────┬─────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Navigate ke /simpanan           │
│ fetch('/api/simpanan')          │
│ fetch('/api/anggota')           │
└────┬────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Tampil:                         │
│ 1. Dropdown Anggota (dari DB)  │
│ 2. Tabel Simpanan (dari DB)    │
│                                 │
│ Tabel columns:                  │
│ - Nama Anggota                 │
│ - Jenis (Pokok/Wajib/Sukarela) │
│ - Jumlah                       │
│ - Tanggal                      │
│ - Status                       │
└────┬────────────────────────────┘
     │
     ▼ User Klik "+ Tambah Simpanan"
┌──────────────────────────────┐
│ Form Input:                  │
│ - Pilih Anggota (dropdown)   │
│ - Jenis Simpanan (select)    │
│ - Jumlah (number input)      │
└──────┬───────────────────────┘
     │
     ▼ User Submit
┌────────────────────────────────────┐
│ POST /api/simpanan                │
│ Body: {                            │
│   id_anggota,                     │
│   jenis_simpanan,                 │
│   jumlah                          │
│ }                                  │
└────┬────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────┐
│ Backend INSERT:                  │
│ INSERT INTO simpanan             │
│ (id_anggota, jenis_simpanan,     │
│  jumlah, tanggal_simpanan,       │
│  status)                         │
│ VALUES (...)                     │
└────┬─────────────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ Refresh & Tampil Success │
└──────────────────────────┘
```

**Database Queries**:
```sql
-- Insert Simpanan
INSERT INTO simpanan (id_anggota, jenis_simpanan, jumlah, tanggal_simpanan, status)
VALUES (1, 'wajib', 500000, NOW(), 'aktif')

-- Fetch Simpanan dengan Join
SELECT s.*, a.nama, a.no_anggota 
FROM simpanan s 
JOIN anggota a ON s.id_anggota = a.id 
ORDER BY s.tanggal_simpanan DESC
```

**Tabel yang digunakan**: `simpanan`, `anggota` (JOIN)

---

### 5️⃣ **ALUR PINJAMAN**

```
┌──────────────────┐
│ User Klik Menu   │
│ "Pinjaman"       │
└────┬─────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Navigate ke /pinjaman           │
│ fetch('/api/pinjaman')          │
│ fetch('/api/anggota')           │
└────┬────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Tampil:                         │
│ 1. Dropdown Anggota            │
│ 2. Tabel Pinjaman              │
│                                 │
│ Columns:                        │
│ - Nama Anggota                 │
│ - Jumlah Pinjam                │
│ - Bunga                        │
│ - Jangka Waktu                 │
│ - Jatuh Tempo                  │
│ - Status                       │
└────┬────────────────────────────┘
     │
     ▼ User Klik "+ Tambah Pinjaman"
┌──────────────────────────────┐
│ Form Input:                  │
│ - Pilih Anggota              │
│ - Jumlah Pinjam              │
│ - Jumlah Bunga               │
│ - Jangka Waktu (select)      │
│   * 6 Bulan                  │
│   * 12 Bulan                 │
│   * 24 Bulan                 │
│   * 36 Bulan                 │
└──────┬───────────────────────┘
     │
     ▼ User Submit
┌────────────────────────────────────┐
│ Frontend Calculate:                │
│ Jatuh Tempo =                      │
│ Hari Ini + Jangka Waktu            │
│                                    │
│ Contoh:                            │
│ Hari Ini: 2024-04-29               │
│ Jangka Waktu: 12 Bulan             │
│ Jatuh Tempo: 2025-04-29            │
└────┬────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│ POST /api/pinjaman                │
│ Body: {                            │
│   id_anggota,                     │
│   jumlah_pinjam,                  │
│   jumlah_bunga,                   │
│   jangka_waktu                    │
│ }                                  │
└────┬────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ Backend:                             │
│ 1. Calculate tanggal_jatuh_tempo    │
│ 2. INSERT INTO pinjaman              │
│    (id_anggota, jumlah_pinjam,       │
│     jumlah_bunga, jangka_waktu,      │
│     tanggal_pinjam,                 │
│     tanggal_jatuh_tempo, status)    │
│    VALUES (...)                     │
└────┬────────────────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ Refresh & Tampil Success │
└──────────────────────────┘
```

**Database Query**:
```sql
INSERT INTO pinjaman (id_anggota, jumlah_pinjam, jumlah_bunga, jangka_waktu, tanggal_pinjam, tanggal_jatuh_tempo, status)
VALUES (1, 5000000, 500000, 12, NOW(), DATE_ADD(NOW(), INTERVAL 12 MONTH), 'aktif')
```

**Tabel yang digunakan**: `pinjaman`, `anggota`

---

### 6️⃣ **ALUR LAPORAN KEUANGAN**

```
┌──────────────────┐
│ User Klik Menu   │
│ "Laporan"        │
└────┬─────────────┘
     │
     ▼
┌──────────────────────────────────┐
│ Navigate ke /laporan-keuangan    │
│ fetch('/api/laporan-keuangan')   │
└────┬───────────────────────────┘
     │
     ▼
┌──────────────────────────────────┐
│ Tampil Tabel Laporan             │
│ Columns:                         │
│ - Periode (Awal - Akhir)        │
│ - Total Simpanan                │
│ - Total Pinjaman                │
│ - Bunga Pinjaman                │
│ - Laba/Rugi (Color: Green/Red)  │
└────┬───────────────────────────┘
     │
     ▼ User Klik "+ Buat Laporan"
┌───────────────────────────────────┐
│ Form Input:                       │
│ - Periode Awal (date picker)      │
│ - Periode Akhir (date picker)     │
│ - Total Simpanan (number)         │
│ - Total Pinjaman (number)         │
│ - Total Bunga Pinjaman (number)   │
│ - Total Biaya (number)            │
│ - Keterangan (textarea)           │
└────┬──────────────────────────────┘
     │
     ▼ User Submit
┌────────────────────────────────────┐
│ Frontend Calculate:                │
│ Laba/Rugi =                        │
│ Total Bunga - Total Biaya          │
│                                    │
│ Contoh:                            │
│ Total Bunga: 50,000,000            │
│ Total Biaya: 10,000,000            │
│ Laba/Rugi: 40,000,000 (Profit)    │
└────┬────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│ POST /api/laporan-keuangan        │
│ Body: {                            │
│   periode_awal,                   │
│   periode_akhir,                  │
│   total_simpanan,                 │
│   total_pinjaman,                 │
│   total_bunga_pinjaman,           │
│   total_biaya,                    │
│   keterangan                      │
│ }                                  │
└────┬────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│ Backend:                             │
│ 1. Calculate total_laba_rugi         │
│ 2. INSERT INTO laporan_keuangan      │
│    (periode_awal, periode_akhir,     │
│     total_simpanan, total_pinjaman,  │
│     total_bunga_pinjaman, total_biaya│
│     total_laba_rugi, keterangan)    │
│    VALUES (...)                     │
└────┬────────────────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ Refresh & Tampil Success │
└──────────────────────────┘
```

**Database Query**:
```sql
INSERT INTO laporan_keuangan 
(periode_awal, periode_akhir, total_simpanan, total_pinjaman, 
 total_bunga_pinjaman, total_biaya, total_laba_rugi, keterangan)
VALUES ('2024-04-01', '2024-04-30', 500000000, 300000000, 
        50000000, 10000000, 40000000, 'Laporan April 2024')
```

**Tabel yang digunakan**: `laporan_keuangan`

---

## 📊 Struktur Data Relasional

```
┌──────────────┐
│   anggota    │
├──────────────┤
│ id (PK)      │◄─────────┐
│ no_anggota   │          │
│ nama         │          │ Foreign Key
│ email        │          │
│ alamat       │          │
│ tanggal_bergabung │     │
│ status       │          │
└──────────────┘          │
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
        ▼                 ▼                  ▼
    ┌──────────┐    ┌──────────────┐   ┌────────────┐
    │ simpanan │    │   pinjaman   │   │ transaksi  │
    ├──────────┤    ├──────────────┤   ├────────────┤
    │ id (PK)  │    │ id (PK)      │   │ id (PK)    │
    │ id_anggota (FK)
    │ jenis    │    │ id_anggota (FK)
    │ jumlah   │    │ jumlah_pinjam│   │ id_anggota (FK)
    │ tanggal  │    │ bunga        │   │ jenis      │
    │ status   │    │ jangka_waktu │   │ jumlah     │
    └──────────┘    │ tanggal_pinjam
    │ status       │ tanggal       │
    └──────────────┘   └────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │pembayaran_pinjaman   │
            ├──────────────────────┤
            │ id (PK)              │
            │ id_pinjaman (FK)     │◄───┐
            │ jumlah_bayar         │    │
            │ tanggal_bayar        │    │ Foreign Key
            │ keterangan           │    │
            └──────────────────────┘    │
                                        │
┌──────────────────────────────┐        │
│      pengguna                │        │
├──────────────────────────────┤        │
│ id (PK)                      │        │
│ username                     │        │
│ password                     │        │
│ nama_lengkap                 │        │
│ role (admin/bendahara/...)   │        │
│ status                       │        │
└──────────────────────────────┘        │
                                        │
        ┌───────────────────────────────┘
        │
        ▼
┌──────────────────────┐
│laporan_keuangan      │
├──────────────────────┤
│ id (PK)              │
│ periode_awal         │
│ periode_akhir        │
│ total_simpanan       │
│ total_pinjaman       │
│ total_bunga_pinjaman │
│ total_biaya          │
│ total_laba_rugi      │
└──────────────────────┘
```

---

## 🔐 Data Flow Keamanan

```
User Input
    ↓
Frontend Validasi
    ↓
API Route (Next.js)
    ↓
Backend Validasi Input
    ↓
Database Query (mysql2)
    ↓
Response JSON
    ↓
Frontend Parse Response
    ↓
Update UI
```

---

## 💾 Backup & Recovery

**Backup Database**:
```bash
mysqldump -u root repa_koperasi > backup_repa.sql
```

**Restore Database**:
```bash
mysql -u root repa_koperasi < backup_repa.sql
```

---

## 📈 Performance Tips

1. **Indeks Database**: Sudah ditambahkan pada kolom-kolom penting
2. **Connection Pooling**: mysql2 menggunakan pool otomatis
3. **Pagination**: Implementasikan limit untuk data besar
4. **Caching**: Tambahkan Redis untuk cache data statis

---

## ✅ Checklist Deployment

- [ ] Database sudah dibuat dan schema diimport
- [ ] User default sudah diinsert
- [ ] `.env.local` sudah dikonfigurasi
- [ ] Node.js dependencies sudah diinstall
- [ ] Build test successful (`npm run build`)
- [ ] Aplikasi berjalan di localhost (`npm run dev`)
- [ ] Semua pages & API routes tested
- [ ] Database backup sudah dibuat

---

**Dibuat untuk Koperasi Indonesia**
