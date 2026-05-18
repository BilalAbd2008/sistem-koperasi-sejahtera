# Sistem Akuntansi Koperasi REPA - Implementasi Lengkap

## 📋 Ringkasan
Sistem akuntansi lengkap untuk koperasi dari **Jurnal Umum → Buku Besar → Neraca Posisi Keuangan → Laporan Laba Rugi** dengan integrasi otomatis ke sistem simpan pinjam.

## 🔧 Komponen yang Sudah Diimplementasikan

### 1. Database Schema Extension
**File**: `database_schema_accounting_extension.sql`

**Tabel Baru:**
- `rekening` - Chart of Accounts dengan 5 kategori:
  - **Aset** (1-xxxx): Kas, Bank, Piutang, Peralatan, dll
  - **Liabilitas** (2-xxxx): Simpanan member (Wajib, Lebaran, Pendidikan)
  - **Modal** (3-xxxx): Modal awal, Laba ditahan, SHU tahun berjalan
  - **Pendapatan** (4-xxxx): Bunga, Lain-lain
  - **Beban** (5-xxxx): Gaji, Admin, Pemeliharaan, Depresiasi

- `jurnal_umum` - General Journal (Header)
  - Nomor jurnal auto: JU-YYYYMMDD-001
  - Tipe: manual, simpanan, pinjaman, bunga, biaya, koreksi
  - Status: draft, posted, reversed

- `jurnal_detail` - Journal Line Items (Detail)
  - Debit/Kredit entries per account
  - Link ke anggota (member) untuk traceability
  - Referensi ke transaksi original

- `saldo_rekening` - Account Balances Cache
  - Per periode (YYYY-MM)
  - Saldo debit, kredit, dan akhir
  - Untuk performa reporting

- `periode_akuntansi` - Accounting Periods
  - YYYY-MM format
  - Status: draft atau closed

### 2. Accounting Library Extension
**File**: `src/lib/accounting.ts`

**Fungsi Baru:**
```typescript
// Journal Entry Management
- generateNomorJurnal() - Auto-generate nomor jurnal
- postJournalEntry() - Post balanced journal dengan validation
- updateSaldoRekening() - Update account balances cache

// Transaction-Specific Journals
- createSavingJournalEntry() - Simpanan member
- createLoanJournalEntry() - Pencairan pinjaman
- createInstallmentJournalEntry() - Pembayaran angsuran

// Financial Reporting
- getTrialBalance() - Trial balance per periode
- getBalanceSheetData() - Neraca data (Aset, Liabilitas, Modal)
- getIncomeStatementData() - Laporan rugi laba
```

### 3. API Routes

#### Jurnal Umum
**Path**: `/api/jurnal`
- **GET**: List journal entries dengan filter periode, tipe, status
- **POST**: Create/post journal entry (balance validation automatic)
- Support legacy system (`transaksi_lain`) dan modern system (`jurnal_umum`)

#### Buku Besar
**Path**: `/api/buku-besar`
- **GET**: Ledger per akun dengan running balance

#### Chart of Accounts
**Path**: `/api/rekening`
- **GET**: List rekening dengan filter kategori
- **POST/PUT/DELETE**: CRUD operations

#### Laporan Keuangan

**Neraca Posisi**
```
GET /api/laporan-keuangan/neraca?periode=2025-05
```
Response:
```json
{
  "assets": [...],
  "liabilities": [...],
  "equity": [...],
  "totalAssets": 10000000,
  "totalLiabilities": 6000000,
  "totalEquity": 4000000
}
```

**Laporan Laba Rugi**
```
GET /api/laporan-keuangan/laba-rugi?periode=2025-05
```
Response:
```json
{
  "revenues": [...],
  "expenses": [...],
  "totalRevenues": 5000000,
  "totalExpenses": 2000000,
  "netIncome": 3000000
}
```

### 4. Integrasi dengan Sistem Simpan Pinjam

#### Setoran Simpanan
**Before**: Hanya write ke `simpanan` + `transaksi_lain`
**After**: Also auto-generate ke `jurnal_umum` + `jurnal_detail`

Contoh journal entry saat setoran Rp 100.000:
```
Jurnal: Setoran Simpanan Wajib - Anggota #5
├─ Debit: Kas (1-1100) → 100.000
└─ Kredit: Simpanan Wajib (2-1100) → 100.000
```

#### Pencairan Pinjaman
**Before**: Hanya write ke `pinjaman` + `transaksi_lain`
**After**: Also auto-generate ke `jurnal_umum` (pokok + bunga recognition)

Contoh journal entry untuk pinjaman Rp 1.000.000 + bunga Rp 100.000:
```
Jurnal: Pencairan Pinjaman - Anggota #5
├─ Debit: Piutang Pinjaman (1-1300) → 1.000.000
├─ Kredit: Kas (1-1100) → 1.000.000
├─ Debit: Piutang Bunga (1-1400) → 100.000
└─ Kredit: Pendapatan Bunga (4-1000) → 100.000
```

#### Pembayaran Angsuran
**Before**: Hanya write ke `pembayaran_pinjaman` + `transaksi_lain`
**After**: Also auto-generate ke `jurnal_umum`

Contoh journal entry saat bayar angsuran Rp 120.000:
```
Jurnal: Pembayaran Angsuran - Anggota #5
├─ Debit: Kas (1-1100) → 120.000
└─ Kredit: Piutang Pinjaman (1-1300) → 120.000
```

**Catatan**: Alokasi bunga pada pembayaran perlu improvement dengan logic yang lebih sophisticated (amortization schedule).

## 🚀 Cara Menggunakan

### 1. Apply Database Schema
```sql
-- Login ke MySQL dan run
SOURCE database_schema_accounting_extension.sql
```

Ini akan create:
- 5 tabel baru
- 25 seed accounts (Chart of Accounts)
- 12 periode (2025-01 s/d 2025-12)

### 2. Buat Manual Journal Entry
```bash
curl -X POST http://localhost:3000/api/jurnal \
  -H "Content-Type: application/json" \
  -d '{
    "tanggalJurnal": "2025-05-15",
    "periode": "2025-05",
    "deskripsi": "Pembayaran SPP Kantor",
    "tipeJurnal": "biaya",
    "idPengguna": 1,
    "lines": [
      {
        "kodeRekening": "1-1100",
        "posisi": "kredit",
        "jumlah": 500000,
        "keterangan": "Pembayaran SPP"
      },
      {
        "kodeRekening": "5-1200",
        "posisi": "debit",
        "jumlah": 500000,
        "keterangan": "Biaya Administrasi"
      }
    ]
  }'
```

### 3. Generate Financial Reports
```bash
# Neraca Posisi Keuangan Mei 2025
curl http://localhost:3000/api/laporan-keuangan/neraca?periode=2025-05

# Laporan Laba Rugi Mei 2025
curl http://localhost:3000/api/laporan-keuangan/laba-rugi?periode=2025-05

# Buku Besar akun Kas
curl http://localhost:3000/api/buku-besar?kodeRekening=1-1100&periode=2025-05
```

## 📊 Chart of Accounts (Seed Data)

| Kode | Nama | Kategori | Tipe Normal |
|------|------|----------|-----------|
| 1-1100 | Kas | Aset | Debit |
| 1-1200 | Bank | Aset | Debit |
| 1-1300 | Piutang Pinjaman | Aset | Debit |
| 1-1400 | Piutang Bunga | Aset | Debit |
| 2-1100 | Simpanan Wajib | Liabilitas | Kredit |
| 2-1200 | Simpanan Lebaran | Liabilitas | Kredit |
| 2-1300 | Simpanan Pendidikan | Liabilitas | Kredit |
| 3-1000 | Modal Pemilik | Modal | Kredit |
| 3-2000 | Laba Ditahan | Modal | Kredit |
| 3-3000 | SHU Tahun Berjalan | Modal | Kredit |
| 4-1000 | Pendapatan Bunga | Pendapatan | Kredit |
| 5-1100 | Gaji & Honorarium | Beban | Debit |
| 5-1200 | Biaya Administrasi | Beban | Debit |
| 5-1300 | Biaya Pemeliharaan | Beban | Debit |

## ⚙️ Advanced Concepts

### Periode Akuntansi
- Format: `YYYY-MM` (e.g., 2025-05)
- Setiap journal entry harus di-assign ke periode tertentu
- Saldo rekening di-cache per periode untuk performa
- Monthly closing: ubah status periode dari draft → closed

### Double Entry Bookkeeping
- Setiap journal entry HARUS balance: Σ debit = Σ kredit
- Validation otomatis di `postJournalEntry()`
- Jika tidak balance, akan error dan rollback

### Backward Compatibility
- Sistem lama (`transaksi_lain`) tetap berfungsi
- Semua transaksi simpan/pinjam auto-post ke KEDUA sistem
- API support query dari `system=old`, `system=new`, atau `system=all`

## 🔄 Next Steps

### 1. Frontend Components (TODO)
```
- Chart of Accounts Manager (CRUD)
- Journal Entry Form (debit/kredit inputs)
- Financial Report Viewer (Neraca & P&L)
- Ledger Viewer (filter by account/period)
```

### 2. Data Migration (TODO)
```sql
-- Migrate existing transaksi_lain to jurnal_umum
-- Script untuk convert historical data
```

### 3. Improvements
- [ ] Amortization schedule untuk pembayaran pinjaman
- [ ] Multi-currency support (sekarang IDR only)
- [ ] Audit trail untuk journal reversals
- [ ] Approval workflow untuk manual entries
- [ ] Budget vs Actual comparison
- [ ] Tax calculation integration

## 📝 Catatan Penting

1. **Performance**: Saldo rekening di-cache di tabel `saldo_rekening` per periode
2. **Consistency**: Semua journal entries otomatis "posted" (status=posted)
3. **Traceability**: Setiap detail jurnal link ke id_anggota untuk audit trail
4. **Validation**: Journal harus balanced sebelum post
5. **Backward Compatibility**: Sistem lama tetap work parallel

## 🐛 Troubleshooting

### Journal tidak seimbang
→ Check debit vs kredit total di request body

### Periode tidak ditemukan
→ Pastikan periode format YYYY-MM dan exist di table periode_akuntansi

### Saldo rekening null/0
→ Pastikan ada journal entries yang posted di periode tersebut

## 📞 Support
Untuk pertanyaan atau issue, check documentation atau update architectural notes.
