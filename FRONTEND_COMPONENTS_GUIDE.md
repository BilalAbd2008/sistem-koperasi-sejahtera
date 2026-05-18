# Frontend Components Integration Guide

Semua komponen frontend untuk sistem akuntansi telah dibuat. Panduan ini menjelaskan cara mengintegrasikannya ke dalam dashboard.

## 📦 Komponen yang Tersedia

### 1. **ChartOfAccountsManager** (`ChartOfAccountsManager.tsx`)
**Fungsi:** Manajemen Chart of Accounts (CRUD)
**Fitur:**
- Daftar akun dengan filter kategori
- Tambah akun baru
- Edit akun
- Hapus akun
- Validasi form
- Color-coded kategori

**Penggunaan:**
```tsx
import { ChartOfAccountsManager } from '@/components/accounting';

export default function Bendahara() {
  return (
    <div>
      <ChartOfAccountsManager />
    </div>
  );
}
```

---

### 2. **JournalEntryForm** (`JournalEntryForm.tsx`)
**Fungsi:** Input Jurnal Umum (double-entry)
**Fitur:**
- Tanggal jurnal picker
- Periode selector (YYYY-MM)
- Tipe jurnal dropdown
- Dynamic debit/kredit line items
- Account code selector (dropdown)
- Amount inputs
- Auto-balance validator (debit = kredit)
- Submit ke POST /api/jurnal

**Penggunaan:**
```tsx
import { JournalEntryForm } from '@/components/accounting';

export default function JurnalPage() {
  return (
    <div>
      <JournalEntryForm />
    </div>
  );
}
```

---

### 3. **NercaReport** (`NeraceReport.tsx`)
**Fungsi:** Neraca Posisi Keuangan (Balance Sheet)
**Fitur:**
- Filter periode dan sistem (new/old/all)
- Display Aset, Liabilitas, Modal
- Total calculations
- Verification section
- Print dan PDF download buttons
- Seimbang/tidak seimbang status

**Penggunaan:**
```tsx
import { NercaReport } from '@/components/accounting';

export default function BalanceSheetPage() {
  return (
    <div>
      <NercaReport />
    </div>
  );
}
```

---

### 4. **LabaRugiReport** (`LabaRugiReport.tsx`)
**Fungsi:** Laporan Laba Rugi (Income Statement)
**Fitur:**
- Filter periode dan sistem
- Display Pendapatan dan Beban
- Net Income calculation
- Profit margin calculation
- Summary section
- Print dan PDF download buttons

**Penggunaan:**
```tsx
import { LabaRugiReport } from '@/components/accounting';

export default function IncomeStatementPage() {
  return (
    <div>
      <LabaRugiReport />
    </div>
  );
}
```

---

### 5. **LedgerViewer** (`LedgerViewer.tsx`)
**Fungsi:** Buku Besar (General Ledger) per akun
**Fitur:**
- Account selector (dropdown dari /api/rekening)
- Periode filter
- System selector (new/old/all)
- Running balance column
- Debit/kredit columns
- Summary totals

**Penggunaan:**
```tsx
import { LedgerViewer } from '@/components/accounting';

export default function LedgerPage() {
  return (
    <div>
      <LedgerViewer />
    </div>
  );
}
```

---

## 🔌 Integration Points

### Option 1: Create Accounting Dashboard Section (RECOMMENDED)

Buat file baru `src/app/dashboard/bendahara/akuntansi/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import {
  ChartOfAccountsManager,
  JournalEntryForm,
  NercaReport,
  LabaRugiReport,
  LedgerViewer,
} from '@/components/accounting';

type TabType = 'coa' | 'journal' | 'ledger' | 'neraca' | 'labarugi';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('journal');

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'coa', label: 'Chart of Accounts', icon: '📊' },
    { id: 'journal', label: 'Jurnal Umum', icon: '📝' },
    { id: 'ledger', label: 'Buku Besar', icon: '📖' },
    { id: 'neraca', label: 'Neraca', icon: '⚖️' },
    { id: 'labarugi', label: 'Laba Rugi', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-8">Akuntansi & Laporan Keuangan</h1>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 bg-white rounded-lg p-2 shadow flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded transition ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'coa' && <ChartOfAccountsManager />}
        {activeTab === 'journal' && <JournalEntryForm />}
        {activeTab === 'ledger' && <LedgerViewer />}
        {activeTab === 'neraca' && <NercaReport />}
        {activeTab === 'labarugi' && <LabaRugiReport />}
      </div>
    </div>
  );
}
```

### Option 2: Add to Existing Bendahara Dashboard

Update `src/app/dashboard/bendahara/page.tsx` to include navigation to accounting:

```tsx
// Add this link to bendahara main dashboard
<Link href="/dashboard/bendahara/akuntansi" className="card">
  <h3>Akuntansi & Laporan Keuangan</h3>
  <p>Kelola jurnal, buku besar, dan laporan keuangan</p>
</Link>
```

---

## 🔄 Data Flow

### Saving New Journal Entry
```
User Input → JournalEntryForm validates → POST /api/jurnal
  → Backend creates jurnal_umum + jurnal_detail rows
  → Updates saldo_rekening cache
  → Returns jurnalId
```

### Viewing Reports
```
LedgerViewer/NercaReport/LabaRugiReport
  → GET /api/buku-besar (or laporan-keuangan/*)
  → Backend queries journal entries
  → Calculates running balances
  → Returns formatted data
  → Components render with formatting
```

---

## 🎨 Dependencies

All components use:
- **React Hooks**: useState, useEffect
- **TypeScript**: Full type safety
- **Tailwind CSS**: Styling
- **Lucide React**: Icons (Plus, Trash2, Save, X, Download, Printer)

No external UI libraries required - pure component implementation.

---

## 📝 Usage Tips

### 1. Set Current User
Components default to `idPengguna: 1`. For production, pass from session:

```tsx
// In JournalEntryForm.tsx, line ~150
const idPengguna = useSession().data?.user?.id || 1; // Get from session
```

### 2. Period Format
Periods must be in `YYYY-MM` format:
- `2025-01` (January 2025)
- `2025-12` (December 2025)

### 3. Account Codes
Chart of Accounts codes follow pattern:
- `1-xxxx`: Aset (Assets)
- `2-xxxx`: Liabilitas (Liabilities)
- `3-xxxx`: Modal (Equity)
- `4-xxxx`: Pendapatan (Revenue)
- `5-xxxx`: Beban (Expenses)

---

## ⚙️ Configuration

### API Endpoints Used

| Component | Endpoints |
|-----------|-----------|
| ChartOfAccountsManager | GET, POST, PUT, DELETE /api/rekening |
| JournalEntryForm | GET /api/rekening, POST /api/jurnal |
| LedgerViewer | GET /api/buku-besar, GET /api/rekening |
| NercaReport | GET /api/laporan-keuangan/neraca |
| LabaRugiReport | GET /api/laporan-keuangan/laba-rugi |

All endpoints support `system=new|old|all` query parameter for dual-system queries.

---

## 🐛 Troubleshooting

### Components not loading?
1. Ensure all API routes exist in `/api/` directories
2. Check database schema has been applied (run database_schema_accounting_extension.sql)
3. Verify Rekening table has seed data

### Balance not calculating correctly?
- Ensure debit/kredit amounts are positive numbers
- Component calculates `totalDebit - totalKredit` internally

### Period not filtering results?
- Use `YYYY-MM` format exactly
- Check if periode_akuntansi record exists in database

---

## 📦 Next Steps

1. ✅ Create accounting page (Option 1 above)
2. ✅ Add navigation link to bendahara dashboard
3. ✅ Test all components in browser
4. ✅ Configure user session integration (idPengguna)
5. ✅ Add period creation wizard
6. ✅ Implement PDF export in reports
7. ✅ Add email report distribution

---

## 📧 Support

For issues or questions:
1. Check ACCOUNTING_SYSTEM.md for backend documentation
2. Verify API responses with curl/Postman
3. Check browser console for JavaScript errors
4. Review database logs for SQL issues

