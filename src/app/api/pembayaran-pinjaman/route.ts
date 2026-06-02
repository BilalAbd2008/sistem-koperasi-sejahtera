import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { 
  addBalancedJournal, 
  installmentJournal,
  postJournalEntry,
  createInstallmentJournalEntry,
  deleteJournalEntriesByReference,
  replaceJournalEntryByReference,
} from "@/lib/accounting";
import { runLoanPaymentAutomation } from "@/lib/loanAutomation";
import { ensureLoanPaymentApprovalColumns } from "@/lib/loanAutomation";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

let loanMigrationPromise: Promise<void> | null = null;

type LoanPaymentLookupRow = RowDataPacket & {
  id_anggota: number | string | null;
  jumlah_bunga: number | string | null;
  jangka_waktu: number | string | null;
};

type PaymentJournalRow = RowDataPacket & {
  id: number | string;
  id_pinjaman: number | string;
  id_anggota: number | string | null;
  jumlah_bunga: number | string | null;
  jangka_waktu: number | string | null;
  jumlah_bayar: number | string;
  tanggal_bayar: string | Date;
  keterangan: string | null;
  status_approval?: "pending" | "approved" | "failed";
};

type PaymentWithoutJournalRow = PaymentJournalRow & {
  id: number | string;
};

const toDateInput = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const toPeriode = (value: Date | string) => toDateInput(value).slice(0, 7);

const addOneMonth = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  const next = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return toDateInput(next);
};

const calculateInstallmentInterest = (
  totalInterest: number | string | null,
  tenor: number | string | null,
) => {
  const tenorValue = Math.max(Number(tenor || 0), 1);
  return Math.round((Number(totalInterest || 0) / tenorValue) * 100) / 100;
};

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

async function ensureLoanPaymentInfrastructure(connection: PoolConnection) {
  await ensureLoanScheduleColumns(connection);
  await ensureLoanPaymentApprovalColumns(connection);
}

async function backfillMissingPaymentJournals(connection: PoolConnection) {
  await ensureLoanPaymentApprovalColumns(connection);

  const [rows] = await connection.query<PaymentWithoutJournalRow[]>(
    `SELECT
      pp.id,
      p.id_anggota,
      p.jumlah_bunga,
      p.jangka_waktu,
      pp.jumlah_bayar,
      pp.tanggal_bayar
    FROM pembayaran_pinjaman pp
    JOIN pinjaman p ON p.id = pp.id_pinjaman
    LEFT JOIN jurnal_umum ju
      ON ju.tipe_jurnal = 'pinjaman'
      AND ju.id_referensi = pp.id
      AND ju.deskripsi LIKE 'Pembayaran Angsuran%'
    WHERE ju.id IS NULL
      AND pp.status_approval = 'approved'
    ORDER BY pp.tanggal_bayar ASC, pp.id ASC`,
  );

  for (const payment of rows) {
    if (!payment.id_anggota) continue;

    await postJournalEntry(
      connection,
      createInstallmentJournalEntry(
        Number(payment.id_anggota),
        Number(payment.jumlah_bayar),
        calculateInstallmentInterest(payment.jumlah_bunga, payment.jangka_waktu),
        payment.tanggal_bayar,
        toPeriode(payment.tanggal_bayar),
        1,
        Number(payment.id),
      ),
    );
  }
}

async function postPaymentJournals(
  connection: PoolConnection,
  payment: PaymentJournalRow,
  idPengguna: number,
) {
  if (!payment.id_anggota) return;

  const pokok = Number(payment.jumlah_bayar);
  const bunga = calculateInstallmentInterest(payment.jumlah_bunga, payment.jangka_waktu);

  await addBalancedJournal(
    connection,
    installmentJournal(Number(payment.id_anggota), pokok, bunga).map((line) => ({
      ...line,
      date: toDateInput(payment.tanggal_bayar),
      description: payment.keterangan?.includes("AUTO-PINJAMAN")
        ? `${line.description} otomatis`
        : line.description,
    })),
  );

  await replaceJournalEntryByReference(
    connection,
    {
      tipeJurnal: "pinjaman",
      idReferensi: Number(payment.id),
      deskripsiPrefix: "Pembayaran Angsuran",
    },
    createInstallmentJournalEntry(
      Number(payment.id_anggota),
      pokok,
      bunga,
      payment.tanggal_bayar,
      toPeriode(payment.tanggal_bayar),
      idPengguna,
      Number(payment.id),
    ),
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id_pinjaman = searchParams.get("id_pinjaman");
    const id_anggota = searchParams.get("id_anggota");

    const connection = await pool.getConnection();
    let pembayaran;
    try {
      await ensureLoanPaymentInfrastructure(connection);
      await connection.beginTransaction();
      await runLoanPaymentAutomation(connection);
      await backfillMissingPaymentJournals(connection);
      await connection.commit();

      let query = `
        SELECT
          pp.*,
          p.id_anggota,
          p.jumlah_pinjam,
          p.jumlah_bunga,
          p.jangka_waktu,
          p.tanggal_mulai,
          p.tanggal_tagih,
          a.nama,
          a.no_anggota,
          GREATEST(
            p.jumlah_pinjam - COALESCE((
              SELECT SUM(pp2.jumlah_bayar)
              FROM pembayaran_pinjaman pp2
              WHERE pp2.id_pinjaman = p.id
                AND pp2.status_approval = 'approved'
                AND (
                  pp2.tanggal_bayar < pp.tanggal_bayar
                  OR (pp2.tanggal_bayar = pp.tanggal_bayar AND pp2.id <= pp.id)
                )
            ), 0),
            0
          ) AS sisa_pinjaman
        FROM pembayaran_pinjaman pp 
        JOIN pinjaman p ON pp.id_pinjaman = p.id
        JOIN anggota a ON p.id_anggota = a.id
      `;
      const params: unknown[] = [];
      const conditions = [];

      if (id_pinjaman) {
        conditions.push("pp.id_pinjaman = ?");
        params.push(id_pinjaman);
      }

      if (id_anggota) {
        conditions.push("p.id_anggota = ?");
        params.push(id_anggota);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY pp.tanggal_bayar DESC";

      [pembayaran] = await connection.query(query, params);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      data: pembayaran,
    });
  } catch (error) {
    console.error("Get pembayaran error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id_pinjaman, jumlah_bayar, keterangan, idPengguna } = await request.json();

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await ensureLoanPaymentInfrastructure(connection);
      
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO pembayaran_pinjaman
          (id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan, status_approval, tanggal_disetujui, id_approver)
         VALUES (?, ?, NOW(), ?, 'approved', NOW(), ?)`,
        [id_pinjaman, jumlah_bayar, keterangan, idPengguna || 1],
      );
      const idPembayaran = result.insertId;

      const [loanRows] = await connection.query<LoanPaymentLookupRow[]>(
        "SELECT id_anggota, jumlah_bunga, jangka_waktu FROM pinjaman WHERE id = ? LIMIT 1",
        [id_pinjaman],
      );
      const loan = loanRows[0];
      const memberId = Number(loan?.id_anggota);
      
      if (memberId) {
        // Legacy: Insert ke transaksi_lain untuk backward compatibility
        const pokok = Number(jumlah_bayar);
        const bunga = calculateInstallmentInterest(
          loan?.jumlah_bunga ?? 0,
          loan?.jangka_waktu ?? 1,
        );

        await addBalancedJournal(
          connection,
          installmentJournal(memberId, pokok, bunga),
        );

        // Modern: Create journal entry ke jurnal_umum system
        const now = new Date();
        const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const modernJournal = createInstallmentJournalEntry(
          memberId,
          pokok,
          bunga,
          now,
          periode,
          idPengguna || 1,
          idPembayaran,
        );

        await postJournalEntry(connection, modernJournal);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil dicatat",
    });
  } catch (error) {
    console.error("Create pembayaran error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan, idPengguna, status_approval } =
      await request.json();

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await ensureLoanPaymentInfrastructure(connection);

      if (status_approval) {
        const [rows] = await connection.query<PaymentJournalRow[]>(
          `SELECT
             pp.id,
             pp.id_pinjaman,
             pp.jumlah_bayar,
             pp.tanggal_bayar,
             pp.keterangan,
             pp.status_approval,
             p.id_anggota,
             p.jumlah_bunga,
             p.jangka_waktu
           FROM pembayaran_pinjaman pp
           JOIN pinjaman p ON p.id = pp.id_pinjaman
           WHERE pp.id = ?
           LIMIT 1`,
          [id],
        );
        const payment = rows[0];
        if (!payment) {
          await connection.rollback();
          return NextResponse.json(
            { success: false, error: "Pembayaran tidak ditemukan" },
            { status: 404 },
          );
        }

        if (status_approval === "approved") {
          if (payment.status_approval !== "approved") {
            await postPaymentJournals(connection, payment, Number(idPengguna || 1));
          }
          await connection.query(
            "UPDATE pembayaran_pinjaman SET status_approval = 'approved', tanggal_disetujui = NOW(), id_approver = ?, keterangan = ? WHERE id = ?",
            [idPengguna || 1, (payment.keterangan || "").replace(" - menunggu approval", " - disetujui"), id],
          );
        } else if (status_approval === "failed") {
          await deleteJournalEntriesByReference(connection, {
            tipeJurnal: "pinjaman",
            idReferensi: Number(id),
            deskripsiPrefix: "Pembayaran Angsuran",
          });
          await connection.query(
            "UPDATE pembayaran_pinjaman SET status_approval = 'failed', tanggal_disetujui = NULL, id_approver = ?, keterangan = ? WHERE id = ?",
            [idPengguna || 1, `${payment.keterangan || "Angsuran otomatis"} - gagal`, id],
          );
          await connection.query(
            `INSERT INTO pembayaran_pinjaman
              (id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan, status_approval)
             VALUES (?, ?, ?, ?, 'pending')`,
            [
              payment.id_pinjaman,
              payment.jumlah_bayar,
              addOneMonth(payment.tanggal_bayar),
              `${payment.keterangan || "Angsuran otomatis"} - dijadwalkan ulang`,
            ],
          );
        } else {
          await connection.rollback();
          return NextResponse.json(
            { success: false, error: "Status approval tidak valid" },
            { status: 400 },
          );
        }

        await connection.commit();
        return NextResponse.json({
          success: true,
          message: status_approval === "approved" ? "Angsuran berhasil disetujui" : "Angsuran ditandai gagal dan dijadwalkan ulang",
        });
      }

      await connection.query(
        "UPDATE pembayaran_pinjaman SET id_pinjaman = ?, jumlah_bayar = ?, tanggal_bayar = ?, keterangan = ? WHERE id = ?",
        [id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan, id],
      );

      const [rows] = await connection.query<PaymentJournalRow[]>(
        `SELECT p.id_anggota, p.jumlah_bunga, p.jangka_waktu, pp.jumlah_bayar, pp.tanggal_bayar
         FROM pembayaran_pinjaman pp
         JOIN pinjaman p ON p.id = pp.id_pinjaman
         WHERE pp.id = ?
         LIMIT 1`,
        [id],
      );
      const payment = rows[0];
      if (!payment || !payment.id_anggota) {
        await connection.rollback();
        return NextResponse.json(
          { success: false, error: "Pembayaran tidak ditemukan" },
          { status: 404 },
        );
      }

      await replaceJournalEntryByReference(
        connection,
        {
          tipeJurnal: "pinjaman",
          idReferensi: Number(id),
          deskripsiPrefix: "Pembayaran Angsuran",
        },
        createInstallmentJournalEntry(
          Number(payment.id_anggota),
          Number(payment.jumlah_bayar),
          calculateInstallmentInterest(payment.jumlah_bunga, payment.jangka_waktu),
          payment.tanggal_bayar,
          toPeriode(payment.tanggal_bayar),
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
      message: "Pembayaran berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update pembayaran error:", error);
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
        deskripsiPrefix: "Pembayaran Angsuran",
      });
      await connection.query("DELETE FROM pembayaran_pinjaman WHERE id = ?", [
        id,
      ]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      message: "Pembayaran berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete pembayaran error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
