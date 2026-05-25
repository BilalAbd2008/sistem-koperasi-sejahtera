import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { 
  addBalancedJournal, 
  loanJournal,
  postJournalEntry,
  createLoanJournalEntry,
  deleteJournalEntriesByReference,
  replaceJournalEntryByReference,
} from "@/lib/accounting";
import { runLoanPaymentAutomation } from "@/lib/loanAutomation";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

type PinjamanJournalRow = RowDataPacket & {
  id_anggota: number | string;
  jumlah_pinjam: number | string;
  jumlah_bunga: number | string | null;
  tanggal_mulai: string | Date;
};

let loanMigrationPromise: Promise<void> | null = null;

const toDateInput = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const toPeriode = (value: Date | string) => toDateInput(value).slice(0, 7);

async function ensureLoanScheduleColumns(connection: PoolConnection) {
  if (!loanMigrationPromise) {
    loanMigrationPromise = (async () => {
      const [columns] = await connection.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pinjaman' AND COLUMN_NAME IN ('tanggal_mulai', 'tanggal_tagih')",
      );
      const existing = new Set(
        (columns as Array<{ COLUMN_NAME: string }>).map(
          (column) => column.COLUMN_NAME,
        ),
      );

      if (!existing.has("tanggal_mulai")) {
        await connection.query(
          "ALTER TABLE pinjaman ADD COLUMN tanggal_mulai DATE NULL AFTER tanggal_pinjam",
        );
        await connection.query(
          "UPDATE pinjaman SET tanggal_mulai = tanggal_pinjam WHERE tanggal_mulai IS NULL",
        );
        await connection.query(
          "ALTER TABLE pinjaman MODIFY tanggal_mulai DATE NOT NULL",
        );
      }

      if (!existing.has("tanggal_tagih")) {
        await connection.query(
          "ALTER TABLE pinjaman ADD COLUMN tanggal_tagih TINYINT NOT NULL DEFAULT 1 AFTER tanggal_mulai",
        );
      }
    })();
  }

  await loanMigrationPromise;
}

function calculateDueDate(startDate: string | Date, tenor: number) {
  const dueDate = new Date(startDate);
  dueDate.setMonth(dueDate.getMonth() + Number(tenor || 0));
  return dueDate;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id_anggota = searchParams.get("id_anggota");

    const connection = await pool.getConnection();
    let pinjaman;
    try {
      await ensureLoanScheduleColumns(connection);
      await connection.beginTransaction();
      await runLoanPaymentAutomation(connection);
      await connection.commit();

      let query = `
        SELECT
          p.*,
          a.nama,
          a.no_anggota,
          COALESCE(payments.total_bayar_pokok, 0) AS total_bayar_pokok,
          GREATEST(p.jumlah_pinjam - COALESCE(payments.total_bayar_pokok, 0), 0) AS sisa_pinjaman
        FROM pinjaman p 
        JOIN anggota a ON p.id_anggota = a.id
        LEFT JOIN (
          SELECT id_pinjaman, SUM(jumlah_bayar) AS total_bayar_pokok
          FROM pembayaran_pinjaman
          GROUP BY id_pinjaman
        ) payments ON payments.id_pinjaman = p.id
      `;
      const params: unknown[] = [];

      if (id_anggota) {
        query += " WHERE p.id_anggota = ?";
        params.push(id_anggota);
      }

      query += " ORDER BY p.tanggal_pinjam DESC";

      [pinjaman] = await connection.query(query, params);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      data: pinjaman,
    });
  } catch (error) {
    console.error("Get pinjaman error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      id_anggota,
      jumlah_pinjam,
      jumlah_bunga,
      jangka_waktu,
      tanggal_mulai,
      tanggal_tagih,
      idPengguna,
    } = await request.json();

    const connection = await pool.getConnection();
    await ensureLoanScheduleColumns(connection);

    const startDate = tanggal_mulai || new Date();
    const jatuh_tempo = calculateDueDate(startDate, Number(jangka_waktu || 0));
    const billingDay = Math.min(Math.max(Number(tanggal_tagih || 1), 1), 31);

    try {
      await connection.beginTransaction();
      
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO pinjaman (id_anggota, jumlah_pinjam, jumlah_bunga, jangka_waktu, tanggal_pinjam, tanggal_mulai, tanggal_tagih, tanggal_jatuh_tempo) 
         VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
        [
          id_anggota,
          jumlah_pinjam,
          jumlah_bunga,
          jangka_waktu,
          startDate,
          billingDay,
          jatuh_tempo,
        ],
      );
      const idPinjaman = result.insertId;

      // Legacy: Insert ke transaksi_lain untuk backward compatibility
      await addBalancedJournal(
        connection,
        loanJournal(
          Number(id_anggota),
          Number(jumlah_pinjam),
          Number(jumlah_bunga || 0),
        ),
      );

      // Modern: Create journal entry ke jurnal_umum system
      const modernJournal = createLoanJournalEntry(
        Number(id_anggota),
        Number(jumlah_pinjam),
        Number(jumlah_bunga || 0),
        startDate,
        toPeriode(startDate),
        idPengguna || 1,
        idPinjaman,
      );

      await postJournalEntry(connection, modernJournal);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      message: "Pinjaman berhasil ditambahkan (dicatat ke jurnal akuntansi)",
    });
  } catch (error) {
    console.error("Create pinjaman error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      id_anggota,
      jumlah_pinjam,
      jumlah_bunga,
      jangka_waktu,
      tanggal_mulai,
      tanggal_tagih,
      status,
      idPengguna,
    } = await request.json();

    const connection = await pool.getConnection();
    try {
      await ensureLoanScheduleColumns(connection);
      await connection.beginTransaction();
      const startDate = tanggal_mulai || new Date();
      const jatuh_tempo = calculateDueDate(startDate, Number(jangka_waktu || 0));
      const billingDay = Math.min(Math.max(Number(tanggal_tagih || 1), 1), 31);

      await connection.query(
        "UPDATE pinjaman SET id_anggota = ?, jumlah_pinjam = ?, jumlah_bunga = ?, jangka_waktu = ?, tanggal_mulai = ?, tanggal_tagih = ?, tanggal_jatuh_tempo = ?, status = ? WHERE id = ?",
        [
          id_anggota,
          jumlah_pinjam,
          jumlah_bunga,
          jangka_waktu,
          startDate,
          billingDay,
          jatuh_tempo,
          status,
          id,
        ],
      );

      const [rows] = await connection.query<PinjamanJournalRow[]>(
        "SELECT id_anggota, jumlah_pinjam, jumlah_bunga, tanggal_mulai FROM pinjaman WHERE id = ? LIMIT 1",
        [id],
      );
      const pinjaman = rows[0];
      if (!pinjaman) {
        await connection.rollback();
        return NextResponse.json(
          { success: false, error: "Pinjaman tidak ditemukan" },
          { status: 404 },
        );
      }

      await replaceJournalEntryByReference(
        connection,
        {
          tipeJurnal: "pinjaman",
          idReferensi: Number(id),
          deskripsiPrefix: "Pencairan Pinjaman",
        },
        createLoanJournalEntry(
          Number(pinjaman.id_anggota),
          Number(pinjaman.jumlah_pinjam),
          Number(pinjaman.jumlah_bunga || 0),
          pinjaman.tanggal_mulai,
          toPeriode(pinjaman.tanggal_mulai),
          Number(idPengguna || 1),
          Number(id),
        ),
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      message: "Pinjaman berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update pinjaman error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await deleteJournalEntriesByReference(connection, {
        tipeJurnal: "pinjaman",
        idReferensi: Number(id),
        deskripsiPrefix: "Pencairan Pinjaman",
      });
      await connection.query("DELETE FROM pinjaman WHERE id = ?", [id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      message: "Pinjaman berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete pinjaman error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
