# REPA Quickstart

This workspace follows the architecture documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Runtime Overview
- Login at `/` routes users by role after storing the session payload in `localStorage`.
- Member dashboards live under `src/app/dashboard/anggota`.
- Bendahara dashboards live under `src/app/dashboard/bendahara`.
- API routes live under `src/app/api` and talk to MySQL via the shared pool in `src/lib/db.ts`.

## Scroll Behavior
- Dashboard pages should use `min-h-screen` plus `overflow-y-auto` on the main wrapper.
- Avoid `h-screen overflow-hidden` unless the page intentionally uses an internal scroll region.

## Interactive Workflows
- Use the forms and API routes for create/edit/delete actions.
- Use `/register`, `/lupa-password`, and `/reset-password` for account onboarding and recovery.
- Use the laporan export buttons for PDF/XLSX generation.

# ⚡ QUICK START - Setup & Jalankan dalam 5 Menit

## 🎯 Prerequisites
- ✅ Node.js 18+
- ✅ Laragon (running)
- ✅ Project folder: `d:\repa-app`

---

## 🚀 Step 1: Setup Database (Laragon)

### Via phpMyAdmin (Recommended)
```
1. Buka: http://localhost/phpmyadmin
2. Login: username: root, password: (kosong)
3. Klik "New" → Buat database: "repa_koperasi"
4. Select database: repa_koperasi
5. Klik tab "Import"
6. Browse file: d:\repa-app\database_schema.sql
7. Klik "Go"
```

### Via Terminal (Alternative)
```bash
# Command Prompt / PowerShell
mysql -u root
CREATE DATABASE repa_koperasi;
USE repa_koperasi;
SOURCE d:/repa-app/database_schema.sql;
```

---

## 🔑 Step 2: Insert Default Users

Buka phpMyAdmin → repa_koperasi → Tab "SQL" → Jalankan:

```sql
INSERT INTO pengguna (username, password, nama_lengkap, email, role, status) VALUES
('admin', 'admin123', 'Administrator', 'admin@koperasi.local', 'admin', 'aktif'),
('bendahara', 'bend123', 'Bendahara Koperasi', 'bendahara@koperasi.local', 'bendahara', 'aktif'),
('pengurus', 'pengurus123', 'Pengurus Koperasi', 'pengurus@koperasi.local', 'pengurus', 'aktif');
```

---

## 📦 Step 3: Install Dependencies

```bash
cd d:\repa-app
npm install
```

---

## ⚙️ Step 4: Configure .env.local

File sudah ada, verify:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=repa_koperasi
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## ▶️ Step 5: Run Development Server

```bash
npm run dev
```

Output:
```
▲ Next.js 16.2.4
✓ Ready in 2.3s
✓ http://localhost:3000
```

**Buka browser**: http://localhost:3000

---

## 🔓 Login

| Credentials | Value |
|------------|-------|
| Username | admin |
| Password | admin123 |

---

## ✨ You're Done!

Anda sekarang bisa:
- ✅ View Dashboard
- ✅ Manage Members (Anggota)
- ✅ Record Savings (Simpanan)
- ✅ Record Loans (Pinjaman)
- ✅ View Financial Reports (Laporan)

---

## 🐛 Troubleshooting

**Error: Cannot connect to database?**
```
→ Pastikan Laragon running
→ Verify .env.local correct
→ Database sudah diimport
```

**Error: Port 3000 in use?**
```bash
PORT=3001 npm run dev
```

**Error: npm command not found?**
```
→ Install Node.js from nodejs.org
→ Restart terminal
```

---

## 📚 Next Steps

1. Read: [README.md](README.md) - Full documentation
2. Read: [SYSTEM_FLOW.md](SYSTEM_FLOW.md) - System architecture
3. Explore: src/ folder - Source code
4. Customize: Sesuaikan dengan kebutuhan koperasi Anda

---

## 🎓 Learning Resources

- Next.js: https://nextjs.org/learn
- Tailwind: https://tailwindcss.com
- MySQL: https://dev.mysql.com/doc
- React: https://react.dev

---

**Selamat! 🎉 Aplikasi REPA Koperasi siap digunakan**
