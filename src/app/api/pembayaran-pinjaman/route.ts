import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { 
  addBalancedJournal, 
  installmentJournal,
  postJournalEntry,
  createInstallmentJournalEntry 
} from "@/lib/accounting";
import { runLoanPaymentAutomation } from "@/lib/loanAutomation";
import type { PoolConnection } from "mysql2/promise";

let loanMigrationPromise: Promise<void> | null = null;

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id_pinjaman = searchParams.get("id_pinjaman");
    const id_anggota = searchParams.get("id_anggota");

    const connection = await pool.getConnection();
    let pembayaran;
    try {
      await ensureLoanScheduleColumns(connection);
      await connection.beginTransaction();
      await runLoanPaymentAutomation(connection);
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
      let params: any[] = [];
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
      
      const [result] = await connection.query(
        "INSERT INTO pembayaran_pinjaman (id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan) VALUES (?, ?, NOW(), ?)",
        [id_pinjaman, jumlah_bayar, keterangan],
      );
      const idPembayaran = (result as any).insertId;

      const [loanRows] = await connection.query(
        "SELECT id_anggota, jumlah_bunga, jangka_waktu FROM pinjaman WHERE id = ? LIMIT 1",
        [id_pinjaman],
      );
      const loan = (loanRows as any[])[0];
      const memberId = Number(loan?.id_anggota);
      
      if (memberId) {
        // Legacy: Insert ke transaksi_lain untuk backward compatibility
        await addBalancedJournal(
          connection,
          installmentJournal(memberId, Number(jumlah_bayar)),
        );

        // Modern: Create journal entry ke jurnal_umum system
        // Allocate pembayaran ke pokok dan bunga (simple: semuanya pokok dulu)
        // TODO: Improve dengan logic pembayaran yang lebih sophisticated
        const pokok = Number(jumlah_bayar);
        const bunga = 0; // Simplified untuk saat ini

        const now = new Date();
        const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        try {
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
        } catch (journalError) {
          console.warn("Modern journal entry failed (non-blocking):", journalError);
        }
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
    const { id, id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan } =
      await request.json();

    const connection = await pool.getConnection();
    await connection.query(
      "UPDATE pembayaran_pinjaman SET id_pinjaman = ?, jumlah_bayar = ?, tanggal_bayar = ?, keterangan = ? WHERE id = ?",
      [id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan, id],
    );
    connection.release();

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
    await connection.query("DELETE FROM pembayaran_pinjaman WHERE id = ?", [
      id,
    ]);
    connection.release();

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
