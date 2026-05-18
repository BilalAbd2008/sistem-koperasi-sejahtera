# REPA Architecture

## Overview
REPA is a Next.js App Router application for cooperative savings, loans, installments, announcements, and financial reporting.

## Core Stack
- Next.js App Router for pages and API routes
- React + TypeScript for client-side interactivity
- Tailwind CSS for layout and styling
- MySQL via `mysql2` pool for persistence
- `jsPDF` and `xlsx` for client-side report export
- `nodemailer` for password reset email delivery

## High-Level Flow
1. User logs in through `/`.
2. Login API returns a session payload stored in `localStorage`.
3. Role routing sends:
   - anggota to `/dashboard/anggota`
   - bendahara to `/dashboard/bendahara`
   - admin/other roles to `/dashboard`
4. Member and bendahara pages fetch data from API routes.
5. Actions such as add/edit/delete/approve/export submit to the backend and refresh the UI.
6. Password recovery uses email token flow:
   - `/lupa-password` requests a reset token
   - `/reset-password` consumes the token

## UI Architecture
### Shared Layout
- `src/app/layout.tsx` hosts the root document and extension-attr scrub script.
- `src/app/globals.css` defines base styling and theme variables.

### Shared Components
- `src/components/MemberSidebar.tsx` is the anggota navigation shell.
- `src/components/BendaharaSidebar.tsx` is the bendahara navigation shell.
- `src/components/Sidebar.tsx` is the legacy/general sidebar used by older dashboard pages.

### Dashboard Pages
- `src/app/dashboard/anggota/*` handles member overview, savings, loans, installments, announcements, and profile.
- `src/app/dashboard/bendahara/*` handles operational management, approvals, announcements, settings, reports, and profile.

## Data Architecture
### Main Tables
- `anggota` stores member identity and contact data.
- `pengguna` stores login credentials and roles.
- `simpanan` stores savings records.
- `pinjaman` stores loan requests and loan status.
- `pembayaran_pinjaman` stores loan installment payments.
- `laporan_keuangan` stores financial report snapshots.
- `pengumuman` stores announcements with role targeting.
- `pengaturan_sistem` stores app settings.
- `transaksi_lain` stores journal/ledger supporting transactions.
- `password_reset_tokens` stores temporary reset tokens.

### API Routes
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/anggota`
- `/api/anggota/profile`
- `/api/pinjaman`
- `/api/simpanan`
- `/api/pembayaran-pinjaman`
- `/api/buku-besar`
- `/api/jurnal`
- `/api/laporan-keuangan`
- `/api/pengumuman`
- `/api/pengaturan`
- `/api/dashboard/anggota`
- `/api/dashboard/bendahara`
- `/api/dashboard/stats`
- `/api/dev/seed-demo`

## Why Some Dashboards Could Not Scroll
The main issue was repeated use of `h-screen overflow-hidden` on dashboard wrappers. That combination locks the viewport height and prevents the page from growing vertically. The page contents could overflow internally, but the browser page itself could not scroll.

## Scroll Fix Strategy
- Replace outer wrappers with `min-h-screen`.
- Allow `overflow-y-auto` on the main content container.
- Keep sidebars as their own vertical columns.
- Keep only the specific table areas scrollable when needed.

## Interactivity Rules
- Forms submit through API routes instead of `window.prompt`.
- Dashboard data refreshes with polling where realtime behavior is useful.
- Profile pages write back to database and persist updated local session data.
- Export actions generate real files in the browser, not alerts.

## Notes
- Some older root pages still exist because they are live routes, not dead code.
- The login flow still uses plaintext passwords in this workspace. That is acceptable for the current local/dev setup, but not for production.
