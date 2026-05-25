import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { addBalancedJournal, postJournalEntry } from "@/lib/accounting";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

let storeDebtMigrationPromise: Promise<void> | null = null;

async function ensureStoreDebtTables(connection: PoolConnection) {
  if (!storeDebtMigrationPromise) {
    storeDebtMigrationPromise = (async () => {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS utang_toko (
          id INT PRIMARY KEY AUTO_INCREMENT,
          id_anggota INT NOT NULL,
          bulan VARCHAR(7) NOT NULL,
          jumlah DECIMAL(12, 2) NOT NULL,
          status ENUM('aktif', 'lunas', 'batal') DEFAULT 'aktif',
          tanggal_input DATE NOT NULL,
          keterangan TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (id_anggota) REFERENCES anggota(id) ON DELETE CASCADE
        )
      `);

      await connection.query(
        "CREATE INDEX idx_utang_toko_anggota ON utang_toko(id_anggota)",
      ).catch(() => undefined);
      await connection.query(
        "CREATE INDEX idx_utang_toko_bulan ON utang_toko(bulan)",
      ).catch(() => undefined);

      await connection.query(`
        INSERT IGNORE INTO rekening
          (kode_rekening, nama_rekening, deskripsi, kategori, tipe_normal, status, tanggal_buat)
        VALUES
          ('1-1500', 'Piutang Toko', 'Piutang barang/toko anggota', 'aset', 'debit', 'aktif', CURDATE()),
          ('4-3000', 'Pendapatan Toko', 'Pendapatan dari transaksi toko anggota', 'pendapatan', 'kredit', 'aktif', CURDATE())
      `);
    })();
  }

  await storeDebtMigrationPromise;
}

const periodToDate = (periode: string) => `${periode}-01`;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const idAnggota = searchParams.get("id_anggota");
    const bulan = searchParams.get("bulan");

    const connection = await pool.getConnection();
    try {
      await ensureStoreDebtTables(connection);

      const conditions: string[] = [];
      const params: Array<string | number> = [];

      if (idAnggota) {
        conditions.push("ut.id_anggota = ?");
        params.push(Number(idAnggota));
      }

      if (bulan) {
        conditions.push("ut.bulan = ?");
        params.push(bulan);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT
          ut.id,
          ut.id_anggota,
          a.no_anggota,
          a.nama,
          a.status_pekerjaan,
          ut.bulan,
          ut.jumlah,
          ut.status,
          ut.tanggal_input,
          ut.keterangan,
          ut.created_at,
          ut.updated_at
        FROM utang_toko ut
        JOIN anggota a ON a.id = ut.id_anggota
        ${whereClause}
        ORDER BY ut.bulan DESC, ut.created_at DESC`,
        params,
      );

      return NextResponse.json({
        success: true,
        data: rows.map((row) => ({
          ...row,
          jumlah: Number(row.jumlah || 0),
        })),
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Get utang toko error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id_anggota, bulan, jumlah, status, keterangan, idPengguna } =
      await request.json();
    const amount = Number(jumlah || 0);

    if (!id_anggota || !bulan || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Nama anggota, bulan, dan jumlah wajib diisi" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();
    try {
      await ensureStoreDebtTables(connection);
      await connection.beginTransaction();

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO utang_toko
          (id_anggota, bulan, jumlah, status, tanggal_input, keterangan)
         VALUES (?, ?, ?, ?, CURDATE(), ?)`,
        [
          Number(id_anggota),
          bulan,
          amount,
          status || "aktif",
          keterangan || null,
        ],
      );

      await addBalancedJournal(connection, [
        {
          account: "Piutang Barang",
          amount,
          type: "debit",
          memberId: Number(id_anggota),
          date: periodToDate(bulan),
          description: "Pencatatan utang toko anggota",
        },
        {
          account: "Pendapatan Lain-lain",
          amount,
          type: "kredit",
          memberId: Number(id_anggota),
          date: periodToDate(bulan),
          description: "Pendapatan dari utang toko anggota",
        },
      ]);

      await postJournalEntry(connection, {
        tanggalJurnal: periodToDate(bulan),
        periode: bulan,
        deskripsi: `Utang Toko - Anggota #${id_anggota}`,
        tipeJurnal: "manual",
        idPengguna: Number(idPengguna || 1),
        idReferensi: result.insertId,
        lines: [
          {
            kodeRekening: "1-1500",
            posisi: "debit",
            jumlah: amount,
            keterangan: "Piutang toko anggota",
            idAnggota: Number(id_anggota),
          },
          {
            kodeRekening: "4-3000",
            posisi: "kredit",
            jumlah: amount,
            keterangan: "Pendapatan toko anggota",
            idAnggota: Number(id_anggota),
          },
        ],
      });

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: "Utang toko berhasil disimpan",
        data: { id: result.insertId },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Create utang toko error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, id_anggota, bulan, jumlah, status, keterangan } =
      await request.json();

    if (!id || !id_anggota || !bulan || Number(jumlah || 0) <= 0) {
      return NextResponse.json(
        { success: false, error: "Data utang toko tidak lengkap" },
        { status: 400 },
      );
    }

    const connection = await pool.getConnection();
    try {
      await ensureStoreDebtTables(connection);
      await connection.query(
        `UPDATE utang_toko
         SET id_anggota = ?, bulan = ?, jumlah = ?, status = ?, keterangan = ?
         WHERE id = ?`,
        [
          Number(id_anggota),
          bulan,
          Number(jumlah),
          status || "aktif",
          keterangan || null,
          Number(id),
        ],
      );

      return NextResponse.json({
        success: true,
        message: "Utang toko berhasil diperbarui",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Update utang toko error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    const connection = await pool.getConnection();
    try {
      await ensureStoreDebtTables(connection);
      await connection.query("DELETE FROM utang_toko WHERE id = ?", [Number(id)]);

      return NextResponse.json({
        success: true,
        message: "Utang toko berhasil dihapus",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Delete utang toko error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
