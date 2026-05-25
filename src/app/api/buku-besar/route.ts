import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

interface LedgerResult {
  system: string;
  old: unknown[] | null;
  new: unknown[] | null;
}

type JournalDetailLookupRow = RowDataPacket & {
  id_jurnal: number;
  kode_rekening: string;
  periode: string;
};

type JournalTotalRow = RowDataPacket & {
  total_debit: number | string | null;
  total_kredit: number | string | null;
};

type JournalAccountPeriodRow = RowDataPacket & {
  kode_rekening: string;
  periode: string;
};

const toPeriode = (dateValue: string) => dateValue.slice(0, 7);

async function ensureAccountingPeriod(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  periode: string,
) {
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

async function recalculateSaldoRekening(
  connection: Awaited<ReturnType<typeof pool.getConnection>>,
  kodeRekening: string,
  periode: string,
) {
  const [rekeningRows] = await connection.query<RowDataPacket[]>(
    "SELECT tipe_normal FROM rekening WHERE kode_rekening = ?",
    [kodeRekening],
  );
  const tipeNormal = String(rekeningRows[0]?.tipe_normal || "debit");

  const [saldoRows] = await connection.query<RowDataPacket[]>(
    `SELECT 
      COALESCE(SUM(CASE WHEN jd.posisi = 'debit' THEN jd.jumlah ELSE 0 END), 0) as total_debit,
      COALESCE(SUM(CASE WHEN jd.posisi = 'kredit' THEN jd.jumlah ELSE 0 END), 0) as total_kredit
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

/**
 * GET /api/buku-besar (General Ledger by Account)
 * Query params:
 *   - akun: account name (for old system) or kodeRekening (for new system)
 *   - periode: YYYY-MM (for new system)
 *   - periode_awal: YYYY-MM-DD
 *   - periode_akhir: YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const akun = searchParams.get("akun");
    const periode = searchParams.get("periode");
    const periodeAwal = searchParams.get("periode_awal");
    const periodeAkhir = searchParams.get("periode_akhir");
    const system = searchParams.get("system") || "new";

    const connection = await pool.getConnection();

    try {
      const result: LedgerResult = {
        system,
        old: null,
        new: null,
      };

      // Fetch from old system (transaksi_lain)
      if (system === "old" || system === "all") {
        let oldQuery = `
          SELECT 
            t.id, 
            t.tanggal_transaksi, 
            t.jenis_transaksi AS akun, 
            t.keterangan,
            t.id_anggota,
            a.nama as nama_anggota,
            CASE WHEN t.tipe = 'debit' THEN t.jumlah ELSE 0 END AS debit,
            CASE WHEN t.tipe = 'kredit' THEN t.jumlah ELSE 0 END AS kredit,
            SUM(CASE WHEN t.tipe = 'debit' THEN t.jumlah ELSE -t.jumlah END)
              OVER (PARTITION BY t.jenis_transaksi ORDER BY t.tanggal_transaksi, t.id) AS saldo
          FROM transaksi_lain t
          LEFT JOIN anggota a ON t.id_anggota = a.id
          WHERE 1=1
        `;
        const oldParams: unknown[] = [];

        if (akun) {
          oldQuery += " AND t.jenis_transaksi = ?";
          oldParams.push(akun);
        }
        if (periodeAwal) {
          oldQuery += " AND DATE(t.tanggal_transaksi) >= ?";
          oldParams.push(periodeAwal);
        }
        if (periodeAkhir) {
          oldQuery += " AND DATE(t.tanggal_transaksi) <= ?";
          oldParams.push(periodeAkhir);
        }

        oldQuery += " ORDER BY t.tanggal_transaksi ASC, t.id ASC";

        const [oldRows] = await connection.query(oldQuery, oldParams);
        result.old = oldRows as unknown[];
      }

      // Fetch from new system (jurnal_detail)
      if (system === "new" || system === "all") {
        let newQuery = `
          SELECT 
            jd.id,
            jd.id_jurnal,
            ju.tanggal_jurnal,
            ju.nomor_jurnal,
            jd.kode_rekening,
            jd.posisi,
            jd.jumlah,
            jd.keterangan,
            jd.id_anggota,
            a.nama as nama_anggota,
            r.nama_rekening,
            r.tipe_normal,
            CASE WHEN jd.posisi = 'debit' THEN jd.jumlah ELSE 0 END AS debit,
            CASE WHEN jd.posisi = 'kredit' THEN jd.jumlah ELSE 0 END AS kredit,
            SUM(
              CASE
                WHEN r.tipe_normal = 'kredit' AND jd.posisi = 'kredit' THEN jd.jumlah
                WHEN r.tipe_normal = 'kredit' AND jd.posisi = 'debit' THEN -jd.jumlah
                WHEN jd.posisi = 'debit' THEN jd.jumlah
                ELSE -jd.jumlah
              END
            ) OVER (PARTITION BY jd.kode_rekening ORDER BY ju.tanggal_jurnal, ju.nomor_jurnal, jd.id) AS saldo
          FROM jurnal_detail jd
          JOIN jurnal_umum ju ON jd.id_jurnal = ju.id
          LEFT JOIN anggota a ON jd.id_anggota = a.id
          LEFT JOIN rekening r ON jd.kode_rekening = r.kode_rekening
          WHERE ju.status_posting = 'posted'
        `;
        const newParams: unknown[] = [];

        if (akun) {
          newQuery += " AND jd.kode_rekening = ?";
          newParams.push(akun);
        }
        if (periode) {
          newQuery += " AND ju.periode = ?";
          newParams.push(periode);
        }
        if (periodeAwal) {
          newQuery += " AND DATE(ju.tanggal_jurnal) >= ?";
          newParams.push(periodeAwal);
        }
        if (periodeAkhir) {
          newQuery += " AND DATE(ju.tanggal_jurnal) <= ?";
          newParams.push(periodeAkhir);
        }

        newQuery += " ORDER BY ju.tanggal_jurnal ASC, ju.nomor_jurnal ASC, jd.id ASC";

        const [newRows] = await connection.query(newQuery, newParams);
        result.new = newRows as unknown[];
      }

      return NextResponse.json({
        success: true,
        data: result,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("GET /api/buku-besar error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      akun,
      tanggal_transaksi,
      tipe,
      jumlah,
      keterangan,
      system = "old",
    } = await request.json();

    if (!id || !tanggal_transaksi || !tipe || !jumlah) {
      return NextResponse.json(
        { success: false, error: "Data buku besar belum lengkap" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();
    try {
      if (system === "new" || system === "modern") {
        const [detailRows] = await connection.query<JournalDetailLookupRow[]>(
          `SELECT jd.id_jurnal, jd.kode_rekening, ju.periode
           FROM jurnal_detail jd
           JOIN jurnal_umum ju ON jd.id_jurnal = ju.id
           WHERE jd.id = ?`,
          [id],
        );

        const currentDetail = detailRows[0];
        if (!currentDetail) {
          return NextResponse.json(
            { success: false, error: "Detail jurnal tidak ditemukan" },
            { status: 404 },
          );
        }

        const nextPeriode = toPeriode(String(tanggal_transaksi));
        const [journalAccountRows] =
          await connection.query<JournalAccountPeriodRow[]>(
            `SELECT DISTINCT jd.kode_rekening, ju.periode
             FROM jurnal_detail jd
             JOIN jurnal_umum ju ON jd.id_jurnal = ju.id
             WHERE jd.id_jurnal = ?`,
            [currentDetail.id_jurnal],
          );
        const affectedPairs = new Set<string>();
        for (const row of journalAccountRows) {
          affectedPairs.add(`${row.kode_rekening}|${row.periode}`);
          affectedPairs.add(`${row.kode_rekening}|${nextPeriode}`);
        }

        await connection.beginTransaction();
        try {
          await ensureAccountingPeriod(connection, nextPeriode);
          await connection.query(
            `UPDATE jurnal_detail
             SET posisi = ?, jumlah = ?, keterangan = ?
             WHERE id = ?`,
            [tipe, Number(jumlah), keterangan || null, id],
          );
          await connection.query(
            "UPDATE jurnal_umum SET tanggal_jurnal = ?, periode = ? WHERE id = ?",
            [tanggal_transaksi, nextPeriode, currentDetail.id_jurnal],
          );

          const [totalRows] = await connection.query<JournalTotalRow[]>(
            `SELECT
              COALESCE(SUM(CASE WHEN posisi = 'debit' THEN jumlah ELSE 0 END), 0) AS total_debit,
              COALESCE(SUM(CASE WHEN posisi = 'kredit' THEN jumlah ELSE 0 END), 0) AS total_kredit
             FROM jurnal_detail
             WHERE id_jurnal = ?`,
            [currentDetail.id_jurnal],
          );
          const totalDebit = Number(totalRows[0]?.total_debit || 0);
          const totalKredit = Number(totalRows[0]?.total_kredit || 0);

          if (Math.abs(totalDebit - totalKredit) > 0.01) {
            await connection.rollback();
            return NextResponse.json(
              {
                success: false,
                error:
                  "Edit ditolak karena jurnal menjadi tidak seimbang. Ubah pasangan debit/kredit lewat jurnal umum.",
              },
              { status: 400 },
            );
          }

          await connection.query(
            `UPDATE jurnal_umum
             SET total_debit = ?, total_kredit = ?
             WHERE id = ?`,
            [totalDebit, totalKredit, currentDetail.id_jurnal],
          );

          for (const pair of affectedPairs) {
            const [kodeRekening, periode] = pair.split("|");
            await recalculateSaldoRekening(connection, kodeRekening, periode);
          }

          await connection.commit();

          return NextResponse.json({
            success: true,
            message: "Detail jurnal berhasil diperbarui",
          });
        } catch (error) {
          await connection.rollback();
          throw error;
        }
      }

      if (!akun) {
        return NextResponse.json(
          { success: false, error: "Akun transaksi diperlukan" },
          { status: 400 },
        );
      }

      const [result] = await connection.query<ResultSetHeader>(
        `UPDATE transaksi_lain
         SET jenis_transaksi = ?, tanggal_transaksi = ?, tipe = ?, jumlah = ?, keterangan = ?
         WHERE id = ?`,
        [akun, tanggal_transaksi, tipe, Number(jumlah), keterangan || "", id],
      );

      return NextResponse.json({
        success: result.affectedRows > 0,
        message: result.affectedRows > 0 ? "Transaksi berhasil diperbarui" : "Transaksi tidak ditemukan",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("PUT /api/buku-besar error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, system = "old" } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID transaksi diperlukan" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();
    try {
      if (system === "new" || system === "modern") {
        const [detailRows] = await connection.query<JournalDetailLookupRow[]>(
          `SELECT jd.id_jurnal, jd.kode_rekening, ju.periode
           FROM jurnal_detail jd
           JOIN jurnal_umum ju ON jd.id_jurnal = ju.id
           WHERE jd.id = ?`,
          [id],
        );
        const currentDetail = detailRows[0];

        if (!currentDetail) {
          return NextResponse.json(
            { success: false, error: "Detail jurnal tidak ditemukan" },
            { status: 404 },
          );
        }

        const [affectedRows] = await connection.query<JournalAccountPeriodRow[]>(
          `SELECT DISTINCT jd.kode_rekening, ju.periode
           FROM jurnal_detail jd
           JOIN jurnal_umum ju ON jd.id_jurnal = ju.id
           WHERE jd.id_jurnal = ?`,
          [currentDetail.id_jurnal],
        );

        await connection.beginTransaction();
        try {
          const [result] = await connection.query<ResultSetHeader>(
            "DELETE FROM jurnal_umum WHERE id = ?",
            [currentDetail.id_jurnal],
          );

          for (const row of affectedRows) {
            await recalculateSaldoRekening(
              connection,
              row.kode_rekening,
              row.periode,
            );
          }

          await connection.commit();

          return NextResponse.json({
            success: result.affectedRows > 0,
            message:
              result.affectedRows > 0
                ? "Jurnal berhasil dihapus dari buku besar"
                : "Jurnal tidak ditemukan",
          });
        } catch (error) {
          await connection.rollback();
          throw error;
        }
      }

      const [result] = await connection.query<ResultSetHeader>(
        "DELETE FROM transaksi_lain WHERE id = ?",
        [id],
      );

      return NextResponse.json({
        success: result.affectedRows > 0,
        message: result.affectedRows > 0 ? "Transaksi berhasil dihapus" : "Transaksi tidak ditemukan",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("DELETE /api/buku-besar error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
