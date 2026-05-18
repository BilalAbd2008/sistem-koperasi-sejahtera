/**
 * Data Migration Script: transaksi_lain → jurnal_umum
 * 
 * Purpose: Convert historical transaction data from legacy system to new accounting system
 * Usage: Run this script to migrate all existing transaksi_lain to jurnal_umum + jurnal_detail
 * 
 * WARNING: This script should be run ONCE during initial setup
 * Backup database before running!
 */

import pool from "@/lib/db";

interface TransaksiLain {
  id: number;
  id_anggota: number | null;
  jenis_transaksi: string;
  jumlah: number;
  tipe: "debit" | "kredit";
  tanggal_transaksi: Date;
  keterangan: string;
}

interface RekeningMap {
  [key: string]: string; // jenis_transaksi → kode_rekening
}

/**
 * Map old transaction types to new account codes
 */
const REKENING_MAPPING: RekeningMap = {
  "Kas": "1-1100",
  "Bank": "1-1200",
  "Piutang Pinjaman": "1-1300",
  "Piutang Bunga": "1-1400",
  "Simpanan Wajib": "2-1100",
  "Simpanan Pokok": "2-1100", // Legacy name
  "Simpanan Lebaran": "2-1200",
  "Simpanan Sukarela": "2-1200", // Legacy name
  "Simpanan Pendidikan": "2-1300",
  "Pendapatan Bunga": "4-1000",
  "Gaji & Honorarium": "5-1100",
  "Biaya Administrasi": "5-1200",
  "Biaya Pemeliharaan": "5-1300",
  "Penyusutan": "5-1400",
};

/**
 * Get or create periode for a given date
 */
async function getOrCreatePeriode(connection: any, date: Date): Promise<string> {
  const periode = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const [rows] = await connection.query(
    "SELECT periode FROM periode_akuntansi WHERE periode = ?",
    [periode],
  );

  if ((rows as any[]).length === 0) {
    const bulanAwal = new Date(date.getFullYear(), date.getMonth(), 1);
    const bulanAkhir = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    await connection.query(
      "INSERT INTO periode_akuntansi (periode, tanggal_mulai, tanggal_akhir, status) VALUES (?, ?, ?, ?)",
      [periode, bulanAwal, bulanAkhir, "closed"],
    );
  }

  return periode;
}

/**
 * Generate nomor jurnal based on date
 */
async function generateNomorJurnal(connection: any, tanggal: Date): Promise<string> {
  const yyyymmdd = tanggal
    .toISOString()
    .split("T")[0]
    .replace(/-/g, "");

  const [rows] = await connection.query(
    "SELECT COUNT(*) as count FROM jurnal_umum WHERE tanggal_jurnal = ?",
    [tanggal],
  );

  const count = (rows as any)[0].count + 1;
  const nomorUrut = String(count).padStart(3, "0");

  return `JU-${yyyymmdd}-${nomorUrut}`;
}

/**
 * Migrate all transaksi_lain to jurnal_umum + jurnal_detail
 */
async function migrateTransactions() {
  const connection = await pool.getConnection();

  try {
    console.log("🔄 Starting data migration...");

    // Fetch all transaksi_lain ordered by tanggal_transaksi
    const [transactions] = await connection.query(
      "SELECT * FROM transaksi_lain ORDER BY tanggal_transaksi ASC, id ASC",
    );

    console.log(`📊 Found ${(transactions as any[]).length} transactions to migrate`);

    // Group transactions by date for journal entries
    const groupedByDate = new Map<string, TransaksiLain[]>();
    for (const txn of transactions as TransaksiLain[]) {
      const dateKey = txn.tanggal_transaksi
        .toISOString()
        .split("T")[0];
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }
      groupedByDate.get(dateKey)!.push(txn);
    }

    console.log(`📅 Grouped into ${groupedByDate.size} days`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const [dateStr, dayTransactions] of groupedByDate.entries()) {
      const tanggalJurnal = new Date(dateStr);
      const periode = await getOrCreatePeriode(connection, tanggalJurnal);

      // Group day's transactions into balanced entries
      // Simple heuristic: group consecutive debit/kredit pairs
      let i = 0;
      while (i < dayTransactions.length) {
        const debitLines: TransaksiLain[] = [];
        const creditLines: TransaksiLain[] = [];

        // Collect lines for this journal entry
        let j = i;
        while (j < dayTransactions.length) {
          const txn = dayTransactions[j];
          const existingLines = [...debitLines, ...creditLines];
          const totalDebit = debitLines.reduce((sum, t) => sum + t.jumlah, 0);
          const totalCredit = creditLines.reduce((sum, t) => sum + t.jumlah, 0);

          if (txn.tipe === "debit") {
            debitLines.push(txn);
          } else {
            creditLines.push(txn);
          }

          // Check if balanced
          const newTotalDebit = debitLines.reduce((sum, t) => sum + t.jumlah, 0);
          const newTotalCredit = creditLines.reduce((sum, t) => sum + t.jumlah, 0);

          if (newTotalDebit === newTotalCredit && newTotalDebit > 0) {
            break; // Found balanced set
          }

          j++;
        }

        // Validate we have balanced lines
        const totalDebit = debitLines.reduce((sum, t) => sum + t.jumlah, 0);
        const totalCredit = creditLines.reduce((sum, t) => sum + t.jumlah, 0);

        if (totalDebit !== totalCredit || totalDebit === 0) {
          console.warn(
            `⚠️  Skipping unbalanced transaction group at ${dateStr}: debit=${totalDebit}, credit=${totalCredit}`,
          );
          skippedCount += 1;
          i = j + 1;
          continue;
        }

        // Create journal entry
        try {
          const nomorJurnal = await generateNomorJurnal(connection, tanggalJurnal);

          // Determine transaction type from first transaction
          let tipeJurnal = "manual";
          const firstJenis = debitLines[0]?.jenis_transaksi || creditLines[0]?.jenis_transaksi;

          if (firstJenis?.toLowerCase().includes("simpanan")) {
            tipeJurnal = "simpanan";
          } else if (firstJenis?.toLowerCase().includes("pinjaman")) {
            tipeJurnal = "pinjaman";
          } else if (firstJenis?.toLowerCase().includes("bunga")) {
            tipeJurnal = "bunga";
          } else if (firstJenis?.toLowerCase().includes("biaya")) {
            tipeJurnal = "biaya";
          }

          const deskripsi = `[MIGRATED] ${firstJenis || "Transaksi Umum"} - ${debitLines[0]?.keterangan || creditLines[0]?.keterangan || ""}`;

          // Insert jurnal_umum
          const [result] = await connection.query(
            `INSERT INTO jurnal_umum 
            (nomor_jurnal, tanggal_jurnal, periode, deskripsi, tipe_jurnal, id_pengguna, status_posting, total_debit, total_kredit)
            VALUES (?, ?, ?, ?, ?, ?, 'posted', ?, ?)`,
            [
              nomorJurnal,
              tanggalJurnal,
              periode,
              deskripsi,
              tipeJurnal,
              1, // system user
              totalDebit,
              totalCredit,
            ],
          );

          const jurnalId = (result as any).insertId;

          // Insert jurnal_detail for debit lines
          for (const txn of debitLines) {
            const kodeRekening = REKENING_MAPPING[txn.jenis_transaksi] || "1-1100";

            await connection.query(
              `INSERT INTO jurnal_detail 
              (id_jurnal, kode_rekening, posisi, jumlah, keterangan, id_anggota)
              VALUES (?, ?, 'debit', ?, ?, ?)`,
              [jurnalId, kodeRekening, txn.jumlah, txn.keterangan, txn.id_anggota],
            );
          }

          // Insert jurnal_detail for credit lines
          for (const txn of creditLines) {
            const kodeRekening = REKENING_MAPPING[txn.jenis_transaksi] || "1-1100";

            await connection.query(
              `INSERT INTO jurnal_detail 
              (id_jurnal, kode_rekening, posisi, jumlah, keterangan, id_anggota)
              VALUES (?, ?, 'kredit', ?, ?, ?)`,
              [jurnalId, kodeRekening, txn.jumlah, txn.keterangan, txn.id_anggota],
            );
          }

          // Update saldo_rekening
          for (const txn of [...debitLines, ...creditLines]) {
            const kodeRekening = REKENING_MAPPING[txn.jenis_transaksi] || "1-1100";

            const [rekeningRow] = await connection.query(
              "SELECT tipe_normal FROM rekening WHERE kode_rekening = ?",
              [kodeRekening],
            );

            if ((rekeningRow as any[]).length > 0) {
              const tipeNormal = (rekeningRow as any)[0].tipe_normal;

              const [saldoRow] = await connection.query(
                `SELECT 
                  SUM(CASE WHEN posisi = 'debit' THEN jumlah ELSE 0 END) as total_debit,
                  SUM(CASE WHEN posisi = 'kredit' THEN jumlah ELSE 0 END) as total_kredit
                FROM jurnal_detail jd
                JOIN jurnal_umum ju ON jd.id_jurnal = ju.id
                WHERE jd.kode_rekening = ? AND ju.periode = ?`,
                [kodeRekening, periode],
              );

              const totalDebit = (saldoRow as any)[0].total_debit || 0;
              const totalCredit = (saldoRow as any)[0].total_kredit || 0;

              let saldoAkhir = 0;
              if (tipeNormal === "debit") {
                saldoAkhir = totalDebit - totalCredit;
              } else {
                saldoAkhir = totalCredit - totalDebit;
              }

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
                  totalCredit,
                  saldoAkhir,
                  totalDebit,
                  totalCredit,
                  saldoAkhir,
                ],
              );
            }
          }

          migratedCount++;
          console.log(`✅ Migrated journal entry ${nomorJurnal} (${debitLines.length + creditLines.length} lines)`);
        } catch (error) {
          console.error(`❌ Error migrating transaction:`, error);
          skippedCount++;
        }

        i = j + 1;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migratedCount} journal entries`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`   📊 Total transactions processed: ${(transactions as any[]).length}`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration
migrateTransactions()
  .then(() => {
    console.log("✨ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  });
