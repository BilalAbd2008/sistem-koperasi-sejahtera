# Diagram Mermaid Sistem Koperasi REPA

File ini berisi flowchart, DFD, ERD, dan class diagram khusus role Bendahara dalam format Mermaid.
Untuk memasukkan ke draw.io: buka draw.io, pilih `Insert > Advanced > Mermaid`, lalu paste salah satu blok kode Mermaid di bawah.

## 1. Flowchart Sistem

```mermaid
flowchart TD
    A([Mulai]) --> B[Bendahara membuka aplikasi]
    B --> C[Halaman Login]
    C --> D[Input username dan password]
    D --> E[POST /api/auth/login]
    E --> F{Kredensial valid?}
    F -- Tidak --> G[Tampilkan pesan error]
    G --> C
    F -- Ya --> H[Simpan data user di localStorage]
    H --> I[Redirect ke Dashboard Bendahara]

    I --> K[Dashboard Bendahara]
    K --> K1[Kelola anggota]
    K --> K2[Kelola simpanan]
    K --> K3[Kelola pinjaman]
    K --> K4[Kelola pembayaran pinjaman]
    K --> K5[Kelola utang toko]
    K --> K6[Kelola rekening akuntansi]
    K --> K7[Input jurnal umum]
    K --> K8[Lihat laporan keuangan]

    K1 --> M[API Route Next.js]
    K2 --> M
    K3 --> M
    K4 --> M
    K5 --> M
    K6 --> M
    K7 --> M
    K8 --> M

    M --> N[(Database MySQL)]
    N --> O[Response JSON]
    O --> P[Update tampilan dashboard]
    P --> Q{Bendahara logout?}
    Q -- Tidak --> K
    Q -- Ya --> R[Hapus sesi localStorage]
    R --> S([Selesai])
```

## 2. DFD Level 0

```mermaid
flowchart LR
    Bendahara[Bendahara]
    Email[Email Service]

    Sistem((Sistem Informasi Koperasi REPA - Bendahara))

    DB_Anggota[(Data Anggota)]
    DB_User[(Data Pengguna)]
    DB_Transaksi[(Data Simpanan, Pinjaman, Angsuran, Utang Toko)]
    DB_Akuntansi[(Data Rekening, Jurnal, Saldo)]
    DB_Laporan[(Data Laporan)]
    DB_Token[(Data Token Reset Password)]

    Bendahara -->|Login, kelola master data, transaksi, jurnal, laporan| Sistem
    Sistem -->|Dashboard, rekap, laporan, hasil ekspor| Bendahara

    Sistem -->|Kirim token reset password| Email
    Email -->|Email reset password| Bendahara

    Sistem <--> DB_Anggota
    Sistem <--> DB_User
    Sistem <--> DB_Transaksi
    Sistem <--> DB_Akuntansi
    Sistem <--> DB_Laporan
    Sistem <--> DB_Token
```

## 3. DFD Level 1

```mermaid
flowchart TD
    Bendahara[Bendahara]
    Mailer[Email Service]

    P1((1. Autentikasi))
    P2((2. Manajemen Anggota))
    P3((3. Simpanan))
    P4((4. Pinjaman dan Angsuran))
    P5((5. Utang Toko))
    P6((6. Akuntansi))
    P7((7. Laporan dan Ekspor))
    P8((8. Pengumuman))

    D1[(pengguna)]
    D2[(anggota)]
    D3[(simpanan)]
    D4[(pinjaman)]
    D5[(pembayaran_pinjaman)]
    D6[(utang_toko)]
    D7[(rekening)]
    D8[(periode_akuntansi)]
    D9[(jurnal_umum)]
    D10[(jurnal_detail)]
    D11[(saldo_rekening)]
    D12[(laporan_keuangan)]
    D13[(pengumuman)]
    D15[(password_reset_tokens)]

    Bendahara -->|username, password| P1
    P1 <--> D1
    P1 <--> D15
    P1 -->|token reset| Mailer
    P1 -->|session user dan role| Bendahara

    Bendahara -->|tambah, ubah, hapus anggota| P2
    P2 <--> D2

    Bendahara -->|input simpanan| P3
    P3 <--> D2
    P3 <--> D3
    P3 -->|jurnal otomatis simpanan| P6

    Bendahara -->|kelola pinjaman dan angsuran| P4
    P4 <--> D2
    P4 <--> D4
    P4 <--> D5
    P4 -->|jurnal pinjaman / pembayaran| P6

    Bendahara -->|input utang toko per bulan| P5
    P5 <--> D2
    P5 <--> D6
    P5 -->|debit piutang toko, kredit pendapatan toko| P6

    Bendahara -->|kelola rekening dan jurnal| P6
    P6 <--> D7
    P6 <--> D8
    P6 <--> D9
    P6 <--> D10
    P6 <--> D11
    P6 <--> D2
    P6 <--> D1

    Bendahara -->|minta laporan, export PDF/Excel| P7
    P7 <--> D3
    P7 <--> D4
    P7 <--> D5
    P7 <--> D6
    P7 <--> D9
    P7 <--> D10
    P7 <--> D11
    P7 <--> D12
    P7 -->|laporan keuangan, buku besar, neraca, laba rugi| Bendahara

    Bendahara -->|buat dan arsipkan pengumuman| P8
    P8 <--> D13
```

## 4. ERD

```mermaid
erDiagram
    ANGGOTA {
        int id PK
        varchar no_anggota UK
        varchar nama
        varchar email UK
        varchar no_telepon
        text alamat
        varchar status_pekerjaan
        date tanggal_bergabung
        enum status
        timestamp created_at
        timestamp updated_at
    }

    PENGGUNA {
        int id PK
        varchar username UK
        varchar password
        varchar nama_lengkap
        varchar email UK
        enum role
        enum status
        timestamp created_at
        timestamp updated_at
    }

    SIMPANAN {
        int id PK
        int id_anggota FK
        enum jenis_simpanan
        decimal jumlah
        date tanggal_simpanan
        enum status
        timestamp created_at
        timestamp updated_at
    }

    PINJAMAN {
        int id PK
        int id_anggota FK
        decimal jumlah_pinjam
        decimal jumlah_bunga
        int jangka_waktu
        date tanggal_pinjam
        date tanggal_mulai
        tinyint tanggal_tagih
        date tanggal_jatuh_tempo
        enum status
        timestamp created_at
        timestamp updated_at
    }

    PEMBAYARAN_PINJAMAN {
        int id PK
        int id_pinjaman FK
        decimal jumlah_bayar
        date tanggal_bayar
        varchar keterangan
        enum status_approval
        datetime tanggal_disetujui
        int id_approver
        timestamp created_at
    }

    UTANG_TOKO {
        int id PK
        int id_anggota FK
        varchar bulan
        decimal jumlah
        enum status
        date tanggal_input
        text keterangan
        timestamp created_at
        timestamp updated_at
    }

    SHU_ALOKASI {
        int id PK
        varchar periode
        varchar kode_alokasi
        varchar label
        decimal persentase
        timestamp created_at
        timestamp updated_at
    }

    LAPORAN_KEUANGAN {
        int id PK
        date periode_awal
        date periode_akhir
        decimal total_simpanan
        decimal total_pinjaman
        decimal total_bunga_pinjaman
        decimal total_biaya
        decimal total_laba_rugi
        text keterangan
        timestamp created_at
        timestamp updated_at
    }

    TRANSAKSI_LAIN {
        int id PK
        int id_anggota FK
        varchar jenis_transaksi
        decimal jumlah
        enum tipe
        date tanggal_transaksi
        text keterangan
        timestamp created_at
    }

    PENGUMUMAN {
        int id PK
        varchar judul
        text isi
        date tanggal_pengumuman
        enum target_role
        enum status
        timestamp created_at
        timestamp updated_at
    }

    PASSWORD_RESET_TOKENS {
        int id PK
        int user_id FK
        varchar token
        datetime expires_at
        datetime used_at
        timestamp created_at
    }

    REKENING {
        int id PK
        varchar kode_rekening UK
        varchar nama_rekening
        text deskripsi
        enum kategori
        enum tipe_normal
        enum jenis_akun
        varchar parent_kode_rekening
        enum status
        date tanggal_buat
        timestamp created_at
        timestamp updated_at
    }

    PERIODE_AKUNTANSI {
        int id PK
        varchar periode UK
        date tanggal_mulai
        date tanggal_akhir
        enum status
        text deskripsi
        timestamp created_at
        timestamp updated_at
    }

    JURNAL_UMUM {
        int id PK
        varchar nomor_jurnal UK
        date tanggal_jurnal
        varchar periode FK
        text deskripsi
        enum tipe_jurnal
        int id_pengguna FK
        int id_referensi
        enum status_posting
        decimal total_debit
        decimal total_kredit
        text keterangan_posting
        datetime tanggal_posting
        timestamp created_at
        timestamp updated_at
    }

    JURNAL_DETAIL {
        int id PK
        int id_jurnal FK
        varchar kode_rekening FK
        enum posisi
        decimal jumlah
        text keterangan
        int id_anggota FK
        timestamp created_at
    }

    SALDO_REKENING {
        int id PK
        varchar kode_rekening FK
        varchar periode FK
        decimal saldo_debit
        decimal saldo_kredit
        decimal saldo_akhir
        timestamp updated_at
    }

    ANGGOTA ||--o{ SIMPANAN : memiliki
    ANGGOTA ||--o{ PINJAMAN : mengajukan
    PINJAMAN ||--o{ PEMBAYARAN_PINJAMAN : dibayar_dengan
    ANGGOTA ||--o{ UTANG_TOKO : memiliki
    ANGGOTA ||--o{ TRANSAKSI_LAIN : terkait
    PENGGUNA ||--o{ PASSWORD_RESET_TOKENS : memiliki
    PENGGUNA ||--o{ JURNAL_UMUM : membuat
    PERIODE_AKUNTANSI ||--o{ JURNAL_UMUM : menampung
    JURNAL_UMUM ||--o{ JURNAL_DETAIL : terdiri_dari
    REKENING ||--o{ JURNAL_DETAIL : dipakai
    ANGGOTA ||--o{ JURNAL_DETAIL : ditelusuri
    REKENING ||--o{ SALDO_REKENING : memiliki
    PERIODE_AKUNTANSI ||--o{ SALDO_REKENING : memiliki
```

## 5. Class Diagram

```mermaid
classDiagram
    class AuthService {
        +login(username, password)
        +register(data)
        +requestPasswordReset(email)
        +resetPassword(token, password)
    }

    class AnggotaService {
        +listAnggota()
        +createAnggota(data)
        +updateAnggota(id, data)
        +deleteAnggota(id)
        +getDetailAnggota(id)
    }

    class SimpananService {
        +listSimpanan(filter)
        +createSimpanan(data)
        +calculateTotalByAnggota(idAnggota)
    }

    class PinjamanService {
        +listPinjaman(filter)
        +createPinjamanAnggota(data)
        +updateStatus(id, status)
        +calculateJatuhTempo(tanggalMulai, jangkaWaktu)
    }

    class PembayaranPinjamanService {
        +listPembayaran(filter)
        +createPembayaran(data)
        +approvePembayaran(id, approverId)
        +calculateSisaPinjaman(idPinjaman)
    }

    class UtangTokoService {
        +listUtangToko(filter)
        +createUtangToko(data)
        +updateUtangToko(id, data)
        +deleteUtangToko(id)
        +createAccountingJournal(data)
    }

    class AccountingService {
        +listRekening()
        +createRekening(data)
        +postJournalEntry(entry)
        +addBalancedJournal(lines)
        +getLedger(filter)
        +getTrialBalance(periode)
        +getNeraca(periode)
        +getLabaRugi(periode)
    }

    class ReportService {
        +getDashboardStats()
        +getFinancialReport(filter)
        +exportPdf(data)
        +exportExcel(data)
    }

    class PengumumanService {
        +listPengumuman(role)
        +createPengumuman(data)
        +updatePengumuman(id, data)
        +archivePengumuman(id)
    }

    class DatabasePool {
        +getConnection()
        +query(sql, params)
        +beginTransaction()
        +commit()
        +rollback()
    }

    class Anggota {
        +int id
        +string noAnggota
        +string nama
        +string email
        +string noTelepon
        +string alamat
        +string statusPekerjaan
        +string status
    }

    class Pengguna {
        +int id
        +string username
        +string password
        +string namaLengkap
        +string email
        +string role
        +string status
    }

    class Simpanan {
        +int id
        +int idAnggota
        +string jenisSimpanan
        +number jumlah
        +date tanggalSimpanan
        +string status
    }

    class Pinjaman {
        +int id
        +int idAnggota
        +number jumlahPinjam
        +number jumlahBunga
        +int jangkaWaktu
        +date tanggalPinjam
        +date tanggalJatuhTempo
        +string status
    }

    class PembayaranPinjaman {
        +int id
        +int idPinjaman
        +number jumlahBayar
        +date tanggalBayar
        +string statusApproval
    }

    class UtangToko {
        +int id
        +int idAnggota
        +string bulan
        +number jumlah
        +string status
        +date tanggalInput
    }

    class Rekening {
        +int id
        +string kodeRekening
        +string namaRekening
        +string kategori
        +string tipeNormal
        +string status
    }

    class JurnalUmum {
        +int id
        +string nomorJurnal
        +date tanggalJurnal
        +string periode
        +string tipeJurnal
        +string statusPosting
        +number totalDebit
        +number totalKredit
    }

    class JurnalDetail {
        +int id
        +int idJurnal
        +string kodeRekening
        +string posisi
        +number jumlah
        +int idAnggota
    }

    AuthService --> DatabasePool
    AnggotaService --> DatabasePool
    SimpananService --> DatabasePool
    PinjamanService --> DatabasePool
    PembayaranPinjamanService --> DatabasePool
    UtangTokoService --> DatabasePool
    AccountingService --> DatabasePool
    ReportService --> DatabasePool
    PengumumanService --> DatabasePool

    AuthService ..> Pengguna
    AnggotaService ..> Anggota
    SimpananService ..> Simpanan
    PinjamanService ..> Pinjaman
    PembayaranPinjamanService ..> PembayaranPinjaman
    UtangTokoService ..> UtangToko
    UtangTokoService --> AccountingService
    AccountingService ..> Rekening
    AccountingService ..> JurnalUmum
    AccountingService ..> JurnalDetail
    ReportService --> AccountingService

    Anggota "1" --> "0..*" Simpanan
    Anggota "1" --> "0..*" Pinjaman
    Pinjaman "1" --> "0..*" PembayaranPinjaman
    Anggota "1" --> "0..*" UtangToko
    Pengguna "1" --> "0..*" JurnalUmum
    JurnalUmum "1" --> "2..*" JurnalDetail
    Rekening "1" --> "0..*" JurnalDetail
    Anggota "1" --> "0..*" JurnalDetail
```
