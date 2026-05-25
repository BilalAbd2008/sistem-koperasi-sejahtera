import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

// ============================================================================
// TYPES
// ============================================================================
type JournalLine = {
  account: string;
  amount: number;
  type: "debit" | "kredit";
  description: string;
  memberId?: number | null;
  date?: Date | string;
};

type JournalEntry = {
  tanggalJurnal: Date | string;
  periode: string; // YYYY-MM
  deskripsi: string;
  tipeJurnal: "manual" | "simpanan" | "pinjaman" | "bunga" | "biaya" | "koreksi";
  idPengguna: number;
  idReferensi?: number | null;
  lines: JournalDetailLine[];
};

type JournalDetailLine = {
  kodeRekening: string;
  posisi: "debit" | "kredit";
  jumlah: number;
  keterangan?: string;
  idAnggota?: number | null;
};

type BalanceSheetRow = {
  kodeRekening: string;
  namaRekening: string;
  kategori: "aset" | "liabilitas" | "modal";
  saldo: number;
  children?: BalanceSheetRow[];
};

type AccountBalanceRow = {
  kode_rekening: string;
  nama_rekening: string;
  kategori: "aset" | "liabilitas" | "modal" | "pendapatan" | "beban";
  saldo: number | string | null;
};

type JournalReferenceFilter = {
  tipeJurnal: JournalEntry["tipeJurnal"];
  idReferensi: number;
  deskripsiPrefix?: string;
};

type AffectedJournalRow = RowDataPacket & {
  kode_rekening: string;
  periode: string;
};

type RekeningTypeRow = RowDataPacket & {
  tipe_normal: "debit" | "kredit";
};

type SaldoTotalRow = RowDataPacket & {
  total_debit: number | string | null;
  total_kredit: number | string | null;
};

type CountRow = RowDataPacket & {
  count: number;
};

type TrialBalanceDbRow = RowDataPacket & {
  kode_rekening: string;
  nama_rekening: string;
  saldoDebit: number | string | null;
  saldoKredit: number | string | null;
};

// ============================================================================
// LEGACY: Keep existing functions for backward compatibility
// ============================================================================
export async function addJournalLine(
  connection: PoolConnection,
  line: JournalLine,
) {
  await connection.query(
    "INSERT INTO transaksi_lain (id_anggota, jenis_transaksi, jumlah, tipe, tanggal_transaksi, keterangan) VALUES (?, ?, ?, ?, ?, ?)",
    [
      line.memberId || null,
      line.account,
      line.amount,
      line.type,
      line.date || new Date(),
      line.description,
    ],
  );
}

export async function addBalancedJournal(
  connection: PoolConnection,
  lines: JournalLine[],
) {
  for (const line of lines) {
    await addJournalLine(connection, line);
  }
}

export function savingJournal(
  memberId: number,
  savingType: string,
  amount: number,
): JournalLine[] {
  const label =
    savingType === "lebaran"
      ? "Simpanan Lebaran"
      : savingType === "pendidikan"
        ? "Simpanan Pendidikan"
        : "Simpanan Wajib";

  return [
    {
      account: "Kas",
      amount,
      type: "debit",
      memberId,
      description: `Setoran ${label}`,
    },
    {
      account: label,
      amount,
      type: "kredit",
      memberId,
      description: `Kewajiban ${label}`,
    },
  ];
}

export function loanJournal(
  memberId: number,
  principal: number,
  interest: number,
): JournalLine[] {
  const lines: JournalLine[] = [
    {
      account: "Piutang Pinjaman",
      amount: principal,
      type: "debit",
      memberId,
      description: "Pencairan pinjaman",
    },
    {
      account: "Kas",
      amount: principal,
      type: "kredit",
      memberId,
      description: "Kas keluar pencairan pinjaman",
    },
  ];

  if (interest > 0) {
    lines.push(
      {
        account: "Piutang Bunga",
        amount: interest,
        type: "debit",
        memberId,
        description: "Pengakuan bunga pinjaman",
      },
      {
        account: "Pendapatan Bunga",
        amount: interest,
        type: "kredit",
        memberId,
        description: "Pendapatan bunga pinjaman",
      },
    );
  }

  return lines;
}

export function installmentJournal(
  memberId: number,
  principal: number,
  interest = 0,
): JournalLine[] {
  const lines: JournalLine[] = [
    {
      account: "Kas",
      amount: principal + interest,
      type: "debit",
      memberId,
      description: "Penerimaan angsuran pinjaman",
    },
    {
      account: "Piutang Pinjaman",
      amount: principal,
      type: "kredit",
      memberId,
      description: "Pelunasan angsuran pinjaman",
    },
  ];

  if (interest > 0) {
    lines.push({
      account: "Pendapatan Bunga",
      amount: interest,
      type: "kredit",
      memberId,
      description: "Pendapatan bunga angsuran",
    });
  }

  return lines;
}

// ============================================================================
// NEW: Complete Journal Entry System (Jurnal Umum → Neraca)
// ============================================================================

/**
 * Generate nomor jurnal otomatis: JU-YYYYMMDD-001
 */
export async function generateNomorJurnal(
  connection: PoolConnection,
  tanggal: Date | string,
): Promise<string> {
  const tanggalObj = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  const yyyymmdd = tanggalObj
    .toISOString()
    .split("T")[0]
    .replace(/-/g, "");

  const [rows] = await connection.query<CountRow[]>(
    "SELECT COUNT(*) as count FROM jurnal_umum WHERE tanggal_jurnal = DATE(?)",
    [tanggal],
  );
  const count = Number(rows[0]?.count || 0) + 1;
  const nomorUrut = String(count).padStart(3, "0");

  return `JU-${yyyymmdd}-${nomorUrut}`;
}

async function ensureAccountingPeriod(
  connection: PoolConnection,
  periode: string,
): Promise<void> {
  const [yearValue, monthValue] = periode.split("-").map(Number);

  if (!yearValue || !monthValue || monthValue < 1 || monthValue > 12) {
    throw new Error(`Periode tidak valid: ${periode}`);
  }

  const tanggalMulai = `${periode}-01`;
  const tanggalAkhir = new Date(yearValue, monthValue, 0)
    .toISOString()
    .slice(0, 10);

  await connection.query(
    `INSERT IGNORE INTO periode_akuntansi 
      (periode, tanggal_mulai, tanggal_akhir, status, deskripsi)
     VALUES (?, ?, ?, 'draft', ?)`,
    [periode, tanggalMulai, tanggalAkhir, `Periode ${periode}`],
  );
}

/**
 * Post journal entry ke sistem akuntansi baru
 * Otomatis validate debit = kredit
 */
export async function postJournalEntry(
  connection: PoolConnection,
  entry: JournalEntry,
): Promise<number> {
  // Validate balanced journal
  const totalDebit = entry.lines.reduce(
    (sum, line) => sum + (line.posisi === "debit" ? line.jumlah : 0),
    0,
  );
  const totalKredit = entry.lines.reduce(
    (sum, line) => sum + (line.posisi === "kredit" ? line.jumlah : 0),
    0,
  );

  if (Math.abs(totalDebit - totalKredit) > 0.01) {
    throw new Error(
      `Journal tidak seimbang. Debit: ${totalDebit}, Kredit: ${totalKredit}`,
    );
  }

  await ensureAccountingPeriod(connection, entry.periode);

  // Generate nomor jurnal
  const nomorJurnal = await generateNomorJurnal(
    connection,
    entry.tanggalJurnal,
  );

  // Insert jurnal_umum header
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO jurnal_umum 
    (nomor_jurnal, tanggal_jurnal, periode, deskripsi, tipe_jurnal, id_pengguna, id_referensi, total_debit, total_kredit, status_posting)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')`,
    [
      nomorJurnal,
      entry.tanggalJurnal,
      entry.periode,
      entry.deskripsi,
      entry.tipeJurnal,
      entry.idPengguna,
      entry.idReferensi || null,
      totalDebit,
      totalKredit,
    ],
  );

  const jurnalId = result.insertId;

  // Insert jurnal_detail lines
  for (const line of entry.lines) {
    await connection.query(
      `INSERT INTO jurnal_detail 
      (id_jurnal, kode_rekening, posisi, jumlah, keterangan, id_anggota)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        jurnalId,
        line.kodeRekening,
        line.posisi,
        line.jumlah,
        line.keterangan || null,
        line.idAnggota || null,
      ],
    );
  }

  // Update saldo_rekening cache
  await updateSaldoRekening(connection, entry.periode, entry.lines);

  return jurnalId;
}

/**
 * Update saldo rekening cache setelah posting
 */
export async function updateSaldoRekening(
  connection: PoolConnection,
  periode: string,
  lines: JournalDetailLine[],
): Promise<void> {
  const rekeningSet = new Set(lines.map((l) => l.kodeRekening));

  for (const kodeRekening of rekeningSet) {
    // Get tipe_normal dari rekening
    const [rekeningRows] = await connection.query<RekeningTypeRow[]>(
      "SELECT tipe_normal FROM rekening WHERE kode_rekening = ?",
      [kodeRekening],
    );

    const tipeNormal = rekeningRows[0]?.tipe_normal;

    if (!tipeNormal) continue;

    // Calculate totals
    const [saldoRows] = await connection.query<SaldoTotalRow[]>(
      `SELECT 
        SUM(CASE WHEN posisi = 'debit' THEN jumlah ELSE 0 END) as total_debit,
        SUM(CASE WHEN posisi = 'kredit' THEN jumlah ELSE 0 END) as total_kredit
      FROM jurnal_detail jd
      JOIN jurnal_umum ju ON jd.id_jurnal = ju.id
      WHERE jd.kode_rekening = ? AND ju.periode = ? AND ju.status_posting = 'posted'`,
      [kodeRekening, periode],
    );

    const totalDebit = Number(saldoRows[0]?.total_debit || 0);
    const totalKredit = Number(saldoRows[0]?.total_kredit || 0);

    // Calculate ending balance
    let saldoAkhir = 0;
    if (tipeNormal === "debit") {
      saldoAkhir = totalDebit - totalKredit;
    } else {
      saldoAkhir = totalKredit - totalDebit;
    }

    // Upsert ke saldo_rekening
    await connection.query(
      `INSERT INTO saldo_rekening 
      (kode_rekening, periode, saldo_debit, saldo_kredit, saldo_akhir)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      saldo_debit = ?, saldo_kredit = ?, saldo_akhir = ?`,
      [
        kodeRekening,
        periode,
        totalDebit,
        totalKredit,
        saldoAkhir,
        totalDebit,
        totalKredit,
        saldoAkhir,
      ],
    );
  }
}

export async function recalculateSaldoRekening(
  connection: PoolConnection,
  kodeRekening: string,
  periode: string,
): Promise<void> {
  const [rekeningRows] = await connection.query<RekeningTypeRow[]>(
    "SELECT tipe_normal FROM rekening WHERE kode_rekening = ?",
    [kodeRekening],
  );

  const tipeNormal = rekeningRows[0]?.tipe_normal;
  if (!tipeNormal) return;

  const [saldoRows] = await connection.query<SaldoTotalRow[]>(
    `SELECT 
      COALESCE(SUM(CASE WHEN posisi = 'debit' THEN jumlah ELSE 0 END), 0) as total_debit,
      COALESCE(SUM(CASE WHEN posisi = 'kredit' THEN jumlah ELSE 0 END), 0) as total_kredit
    FROM jurnal_detail jd
    JOIN jurnal_umum ju ON jd.id_jurnal = ju.id
    WHERE jd.kode_rekening = ? AND ju.periode = ? AND ju.status_posting = 'posted'`,
    [kodeRekening, periode],
  );

  const totalDebit = Number(saldoRows[0]?.total_debit || 0);
  const totalKredit = Number(saldoRows[0]?.total_kredit || 0);
  const saldoAkhir =
    tipeNormal === "kredit" ? totalKredit - totalDebit : totalDebit - totalKredit;

  await connection.query(
    `INSERT INTO saldo_rekening
      (kode_rekening, periode, saldo_debit, saldo_kredit, saldo_akhir)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      saldo_debit = ?, saldo_kredit = ?, saldo_akhir = ?`,
    [
      kodeRekening,
      periode,
      totalDebit,
      totalKredit,
      saldoAkhir,
      totalDebit,
      totalKredit,
      saldoAkhir,
    ],
  );
}

export async function deleteJournalEntriesByReference(
  connection: PoolConnection,
  filter: JournalReferenceFilter,
): Promise<void> {
  const params: Array<string | number> = [filter.tipeJurnal, filter.idReferensi];
  let condition = "ju.tipe_jurnal = ? AND ju.id_referensi = ?";

  if (filter.deskripsiPrefix) {
    condition += " AND ju.deskripsi LIKE ?";
    params.push(`${filter.deskripsiPrefix}%`);
  }

  const [affectedRows] = await connection.query<AffectedJournalRow[]>(
    `SELECT DISTINCT jd.kode_rekening, ju.periode
     FROM jurnal_umum ju
     JOIN jurnal_detail jd ON jd.id_jurnal = ju.id
     WHERE ${condition}`,
    params,
  );

  await connection.query(`DELETE ju FROM jurnal_umum ju WHERE ${condition}`, params);

  for (const row of affectedRows) {
    await recalculateSaldoRekening(connection, row.kode_rekening, row.periode);
  }
}

export async function replaceJournalEntryByReference(
  connection: PoolConnection,
  filter: JournalReferenceFilter,
  entry: JournalEntry,
): Promise<number> {
  await deleteJournalEntriesByReference(connection, filter);
  return postJournalEntry(connection, entry);
}

/**
 * Create journal entry untuk SIMPANAN (setoran member)
 */
export function createSavingJournalEntry(
  memberId: number,
  savingType: "wajib" | "lebaran" | "pendidikan" | "sukarela",
  amount: number,
  tanggalJurnal: Date | string,
  periode: string,
  idPengguna: number,
  idSimpanan: number,
): JournalEntry {
  const rekeningMap: Record<string, string> = {
    wajib: "2-1100",
    lebaran: "2-1200",
    pendidikan: "2-1300",
    sukarela: "2-1400",
  };

  return {
    tanggalJurnal,
    periode,
    deskripsi: `Setoran Simpanan ${savingType.charAt(0).toUpperCase() + savingType.slice(1)} - Anggota #${memberId}`,
    tipeJurnal: "simpanan",
    idPengguna,
    idReferensi: idSimpanan,
    lines: [
      {
        kodeRekening: "1-1100", // Kas
        posisi: "debit",
        jumlah: amount,
        keterangan: `Setoran Simpanan ${savingType}`,
        idAnggota: memberId,
      },
      {
        kodeRekening: rekeningMap[savingType],
        posisi: "kredit",
        jumlah: amount,
        keterangan: `Liabilitas Simpanan ${savingType}`,
        idAnggota: memberId,
      },
    ],
  };
}

/**
 * Create journal entry untuk PINJAMAN (pencairan)
 */
export function createLoanJournalEntry(
  memberId: number,
  principal: number,
  interest: number,
  tanggalJurnal: Date | string,
  periode: string,
  idPengguna: number,
  idPinjaman: number,
): JournalEntry {
  const lines: JournalDetailLine[] = [
    {
      kodeRekening: "1-1300", // Piutang Pinjaman
      posisi: "debit",
      jumlah: principal,
      keterangan: "Pencairan Pinjaman",
      idAnggota: memberId,
    },
    {
      kodeRekening: "1-1100", // Kas
      posisi: "kredit",
      jumlah: principal,
      keterangan: "Kas Keluar - Pencairan Pinjaman",
      idAnggota: memberId,
    },
  ];

  if (interest > 0) {
    lines.push(
      {
        kodeRekening: "1-1400", // Piutang Bunga
        posisi: "debit",
        jumlah: interest,
        keterangan: "Bunga Pinjaman",
        idAnggota: memberId,
      },
      {
        kodeRekening: "4-1000", // Pendapatan Bunga
        posisi: "kredit",
        jumlah: interest,
        keterangan: "Pendapatan Bunga Pinjaman",
        idAnggota: memberId,
      },
    );
  }

  return {
    tanggalJurnal,
    periode,
    deskripsi: `Pencairan Pinjaman - Anggota #${memberId}`,
    tipeJurnal: "pinjaman",
    idPengguna,
    idReferensi: idPinjaman,
    lines,
  };
}

/**
 * Create journal entry untuk PEMBAYARAN ANGSURAN
 */
export function createInstallmentJournalEntry(
  memberId: number,
  principal: number,
  interest: number,
  tanggalJurnal: Date | string,
  periode: string,
  idPengguna: number,
  idPembayaran: number,
): JournalEntry {
  const lines: JournalDetailLine[] = [
    {
      kodeRekening: "1-1100", // Kas
      posisi: "debit",
      jumlah: principal + interest,
      keterangan: "Penerimaan Angsuran Pinjaman",
      idAnggota: memberId,
    },
    {
      kodeRekening: "1-1300", // Piutang Pinjaman
      posisi: "kredit",
      jumlah: principal,
      keterangan: "Pelunasan Angsuran Pokok",
      idAnggota: memberId,
    },
  ];

  if (interest > 0) {
    lines.push({
      kodeRekening: "4-1000", // Pendapatan Bunga
      posisi: "kredit",
      jumlah: interest,
      keterangan: "Pendapatan Bunga Angsuran",
      idAnggota: memberId,
    });
  }

  return {
    tanggalJurnal,
    periode,
    deskripsi: `Pembayaran Angsuran Pinjaman - Anggota #${memberId}`,
    tipeJurnal: "pinjaman",
    idPengguna,
    idReferensi: idPembayaran,
    lines,
  };
}

/**
 * Get trial balance untuk periode tertentu
 */
export async function getTrialBalance(
  connection: PoolConnection,
  periode: string,
): Promise<
  Array<{
    kodeRekening: string;
    namaRekening: string;
    saldoDebit: number;
    saldoKredit: number;
  }>
> {
  const [rows] = await connection.query<TrialBalanceDbRow[]>(
    `SELECT 
      r.kode_rekening,
      r.nama_rekening,
      COALESCE(s.saldo_debit, 0) as saldoDebit,
      COALESCE(s.saldo_kredit, 0) as saldoKredit
    FROM rekening r
    JOIN saldo_rekening s ON r.kode_rekening = s.kode_rekening AND s.periode = ?
    WHERE r.status = 'aktif'
      AND (COALESCE(s.saldo_debit, 0) <> 0 OR COALESCE(s.saldo_kredit, 0) <> 0)
    ORDER BY r.kode_rekening`,
    [periode],
  );

  return rows.map((row) => ({
    kodeRekening: row.kode_rekening,
    namaRekening: row.nama_rekening,
    saldoDebit: Number(row.saldoDebit || 0),
    saldoKredit: Number(row.saldoKredit || 0),
  }));
}

/**
 * Get balance sheet data
 */
export async function getBalanceSheetData(
  connection: PoolConnection,
  periode: string,
): Promise<{
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}> {
  const [rows] = await connection.query(
    `SELECT 
      r.kode_rekening,
      r.nama_rekening,
      r.kategori,
      COALESCE(s.saldo_akhir, 0) as saldo
    FROM rekening r
    LEFT JOIN saldo_rekening s ON r.kode_rekening = s.kode_rekening AND s.periode = ?
    WHERE r.status = 'aktif' AND r.kategori IN ('aset', 'liabilitas', 'modal')
    ORDER BY r.kode_rekening`,
    [periode],
  );

  const data = rows as AccountBalanceRow[];
  const assets = data
    .filter((r) => r.kategori === "aset")
    .map((r) => ({
      kodeRekening: r.kode_rekening,
      namaRekening: r.nama_rekening,
      kategori: "aset" as const,
      saldo: Math.max(Number(r.saldo || 0), 0),
    }));

  const liabilities = data
    .filter((r) => r.kategori === "liabilitas")
    .map((r) => ({
      kodeRekening: r.kode_rekening,
      namaRekening: r.nama_rekening,
      kategori: "liabilitas" as const,
      saldo: Math.max(Number(r.saldo || 0), 0),
    }));

  const equity = data
    .filter((r) => r.kategori === "modal")
    .map((r) => ({
      kodeRekening: r.kode_rekening,
      namaRekening: r.nama_rekening,
      kategori: "modal" as const,
      saldo: Math.max(Number(r.saldo || 0), 0),
    }));

  const totalAssets = assets.reduce((sum, r) => sum + r.saldo, 0);
  const totalLiabilities = liabilities.reduce((sum, r) => sum + r.saldo, 0);
  const totalEquity = equity.reduce((sum, r) => sum + r.saldo, 0);

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
  };
}

/**
 * Get income statement data
 */
export async function getIncomeStatementData(
  connection: PoolConnection,
  periode: string,
): Promise<{
  revenues: Array<{ kodeRekening: string; namaRekening: string; amount: number }>;
  expenses: Array<{ kodeRekening: string; namaRekening: string; amount: number }>;
  totalRevenues: number;
  totalExpenses: number;
  netIncome: number;
}> {
  const [rows] = await connection.query(
    `SELECT 
      r.kode_rekening,
      r.nama_rekening,
      r.kategori,
      COALESCE(s.saldo_akhir, 0) as saldo
    FROM rekening r
    LEFT JOIN saldo_rekening s ON r.kode_rekening = s.kode_rekening AND s.periode = ?
    WHERE r.status = 'aktif' AND r.kategori IN ('pendapatan', 'beban')
    ORDER BY r.kode_rekening`,
    [periode],
  );

  const data = rows as AccountBalanceRow[];
  const revenues = data
    .filter((r) => r.kategori === "pendapatan")
    .map((r) => ({
      kodeRekening: r.kode_rekening,
      namaRekening: r.nama_rekening,
      amount: Math.max(Number(r.saldo || 0), 0),
    }));

  const expenses = data
    .filter((r) => r.kategori === "beban")
    .map((r) => ({
      kodeRekening: r.kode_rekening,
      namaRekening: r.nama_rekening,
      amount: Math.max(Number(r.saldo || 0), 0),
    }));

  const totalRevenues = revenues.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenses.reduce((sum, r) => sum + r.amount, 0);
  const netIncome = totalRevenues - totalExpenses;

  return {
    revenues,
    expenses,
    totalRevenues,
    totalExpenses,
    netIncome,
  };
}
