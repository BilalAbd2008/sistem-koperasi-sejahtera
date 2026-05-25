# REPA Koperasi - Sistem Informasi Simpanan Pinjam

Aplikasi web modern untuk mengelola sistem simpanan dan pinjam anggota koperasi. Dibangun dengan **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS**, dan **MySQL**.


## Setup di Laptop Baru

Ikuti langkah ini setelah project berhasil di-clone dari GitHub.

### 1. Install aplikasi yang dibutuhkan

- Install Node.js versi 20.9 atau lebih baru.
- Install Laragon.
- Pastikan project berada di folder lokal, contoh: `D:\repa-app`.

### 2. Jalankan Laragon

1. Buka Laragon.
2. Klik `Start All`.
3. Pastikan MySQL berjalan.
4. Untuk cek phpMyAdmin, buka `http://localhost/phpmyadmin`.

Default Laragon biasanya memakai:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=repa_koperasi
```

### 3. Install dependency project

Buka terminal di folder project:

```bash
cd D:\repa-app
npm install
```

### 4. Siapkan file environment

Pastikan file `.env.local` ada di root project dan berisi:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=repa_koperasi
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 5. Setup database

Aplikasi akan mencoba membuat database `repa_koperasi` dan import schema otomatis saat API pertama kali diakses.

Jika ingin setup manual lewat terminal:

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS repa_koperasi;"
mysql -u root repa_koperasi < database_schema.sql
mysql -u root repa_koperasi < database_schema_accounting_extension.sql
```

Jika ingin setup manual lewat phpMyAdmin:

1. Buka `http://localhost/phpmyadmin`.
2. Buat database baru bernama `repa_koperasi`.
3. Pilih database `repa_koperasi`.
4. Masuk tab `Import`.
5. Import file `database_schema.sql`.
6. Import file `database_schema_accounting_extension.sql`.

### 6. Jalankan aplikasi

```bash
npm run dev
```

Buka browser:

```text
http://localhost:3000
```

### 7. Login

Gunakan akun bendahara:

```text
Username: bendahara
Password: bend123
```

Catatan: endpoint login saat ini hanya menerima role `bendahara`, jadi akun `admin/admin123` belum bisa dipakai dari halaman login utama.

---

## 📋 Daftar Fitur

✅ **Dashboard** - Statistik Real-time  
✅ **Manajemen Anggota** - CRUD Members  
✅ **Simpanan** - Tracking Savings (Pokok, Wajib, Sukarela)  
✅ **Pinjaman** - Tracking Loans dengan Bunga  
✅ **Laporan Keuangan** - Kalkulasi Otomatis Laba/Rugi  
✅ **Authentication** - Login dengan Role-based Access

---

## 🧾 User Story Anggota

### 1. Dashboard Anggota

**User Story:**
Sebagai anggota, saya ingin melihat ringkasan simpanan dan pinjaman agar mengetahui kondisi keuangan saya.

**Acceptance Criteria:**

- Menampilkan total simpanan
- Menampilkan sisa pinjaman
- Menampilkan angsuran terdekat
- Data real-time dari backend

**Implementasi saat ini:**

- UI: dashboard anggota
- Data: GET /api/dashboard/anggota

### 2. Melihat Simpanan

**User Story:**
Sebagai anggota, saya ingin melihat data simpanan saya agar bisa memantau saldo dan riwayat.

**Acceptance Criteria:**

- Menampilkan simpanan pokok
- Menampilkan simpanan wajib
- Menampilkan simpanan sukarela
- Ada riwayat transaksi

**Implementasi saat ini:**

- UI: halaman simpanan anggota
- Data: GET /api/simpanan

### 3. Mengajukan Pinjaman

**User Story:**
Sebagai anggota, saya ingin mengajukan pinjaman agar dapat memperoleh dana dari koperasi.

**Acceptance Criteria:**

- Form input jumlah pinjaman
- Form input tenor
- Status: menunggu / disetujui / ditolak

**Implementasi saat ini:**

- UI: halaman pinjaman anggota
- Data: GET/POST /api/pinjaman

### 4. Melihat Angsuran

**User Story:**
Sebagai anggota, saya ingin melihat jadwal angsuran agar tahu kapan harus membayar.

**Acceptance Criteria:**

- Menampilkan tanggal jatuh tempo
- Menampilkan nominal
- Menampilkan status pembayaran

**Implementasi saat ini:**

- UI: halaman angsuran anggota
- Data: GET /api/pembayaran-pinjaman

### 5. Melihat Pengumuman

**User Story:**
Sebagai anggota, saya ingin melihat pengumuman agar mengetahui informasi terbaru dari koperasi.

**Acceptance Criteria:**

- Menampilkan daftar pengumuman terbaru
- Menampilkan tanggal dan isi ringkas pengumuman

**Implementasi saat ini:**

- UI: halaman pengumuman anggota
- Data: saat ini statis, dapat dilanjutkan ke endpoint backend

### 6. Profil

**User Story:**
Sebagai anggota, saya ingin mengubah data pribadi agar informasi saya tetap akurat.

**Acceptance Criteria:**

- Menampilkan data profil anggota
- Tersedia aksi ubah data pribadi

**Implementasi saat ini:**

- UI: halaman profil anggota
- Data: dari session user (localStorage), edit profil dapat dikembangkan ke endpoint backend

---

## 🛠 Teknologi Stack

| Layer       | Teknologi                        |
| ----------- | -------------------------------- |
| Frontend    | Next.js 16, React 19, TypeScript |
| UI          | Tailwind CSS                     |
| Backend     | Next.js API Routes               |
| Database    | MySQL 8 + mysql2/promise         |
| Development | Laragon (Local Environment)      |

---

## 📦 Prasyarat

- Node.js 20.9 atau lebih baru
- Laragon (download: https://laragon.org/)

---

## 🔧 Setup Database Laragon

### Step 1: Buat Database

```sql
CREATE DATABASE repa_koperasi;
USE repa_koperasi;
```

Catatan: langkah ini sekarang opsional. Aplikasi akan mencoba membuat database dan memuat schema secara otomatis saat API pertama dijalankan.

### Step 2: Import Schema

```bash
mysql -u root repa_koperasi < database_schema.sql
mysql -u root repa_koperasi < database_schema_accounting_extension.sql
```

### Step 3: Insert User Default

```sql
INSERT INTO pengguna (username, password, nama_lengkap, email, role, status) VALUES
('admin', 'admin123', 'Administrator', 'admin@koperasi.local', 'admin', 'aktif'),
('bendahara', 'bend123', 'Bendahara Koperasi', 'bendahara@koperasi.local', 'bendahara', 'aktif'),
('pengurus', 'pengurus123', 'Pengurus Koperasi', 'pengurus@koperasi.local', 'pengurus', 'aktif');
```

---

## 🎯 Alur Sistem

### Flow Login

```
User Input → Validasi DB → Success → localStorage → Dashboard
```

### Flow Dashboard

```
Fetch Stats API → 4 Cards (Members, Savings, Loans, Interest) → Menu Links
```

### Flow Anggota

```
List → Add Form → POST API → DB Save → Refresh Table
```

### Flow Simpanan & Pinjaman

```
Select Member → Input Data → POST API → DB Save → Refresh
```

### Flow Laporan

```
Input Period + Data → Auto Calculate Profit/Loss → Save Report
```

---

## 📡 API Routes

```
POST   /api/auth/login
GET    /api/anggota
POST   /api/anggota
GET    /api/simpanan
POST   /api/simpanan
GET    /api/pinjaman
POST   /api/pinjaman
GET    /api/pembayaran-pinjaman
POST   /api/pembayaran-pinjaman
GET    /api/dashboard/stats
GET    /api/laporan-keuangan
POST   /api/laporan-keuangan
```

---

## 📁 Struktur Project

```
repa-app/
├── src/
│   ├── app/
│   │   ├── api/          ← API Routes
│   │   ├── dashboard/    ← Dashboard Page
│   │   ├── anggota/      ← Members Page
│   │   ├── simpanan/     ← Savings Page
│   │   ├── pinjaman/     ← Loans Page
│   │   ├── laporan-keuangan/  ← Reports Page
│   │   └── page.tsx      ← Login Page
│   ├── components/
│   │   └── Sidebar.tsx   ← Navigation
│   └── lib/
│       └── db.ts         ← Database Connection
├── database_schema.sql   ← Database Schema
├── .env.local           ← Config File
└── README.md
```

---

## ⚙️ Konfigurasi .env.local

```env
# Database (Laragon)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=repa_koperasi

# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## 🏃 Menjalankan Aplikasi

### Development

```bash
npm run dev
→ http://localhost:3000
```

### Production

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

---

## 🔐 Login Credentials

| Role      | Username  | Password    | Catatan |
| --------- | --------- | ----------- | ------- |
| Bendahara | bendahara | bend123     | Bisa login di halaman `/` |
| Admin     | admin     | admin123    | Belum diterima endpoint login utama saat ini |
| Pengurus  | pengurus  | pengurus123 | Belum diterima endpoint login utama saat ini |

---

## ⚠️ Troubleshooting

**Q: Database connection error?**  
A: Pastikan Laragon running, verifikasi .env.local, dan database sudah dibuat.

**Q: Port 3000 sudah digunakan?**  
A: `PORT=3001 npm run dev`

**Q: Tabel tidak ada?**  
A: Import database_schema.sql ke phpMyAdmin.

---

## 📝 Catatan Keamanan

⚠️ Untuk production:

- Hash password dengan bcrypt
- Gunakan JWT untuk auth
- Implementasikan rate limiting
- Validasi input ketat
- Gunakan HTTPS
- Setup CORS proper

---

## 📚 Dokumentasi

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [MySQL](https://dev.mysql.com/doc/)
- [Laragon](https://laragon.org/docs)

---

**Dibuat dengan ❤️ untuk Koperasi Indonesia**
