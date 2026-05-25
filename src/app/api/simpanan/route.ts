import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { 
  addBalancedJournal, 
  savingJournal,
  postJournalEntry,
  createSavingJournalEntry,
  deleteJournalEntriesByReference,
  replaceJournalEntryByReference,
} from "@/lib/accounting";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

type SimpananJournalRow = RowDataPacket & {
  id_anggota: number | string;
  jenis_simpanan: "wajib" | "lebaran" | "pendidikan" | "sukarela";
  jumlah: number | string;
  tanggal_simpanan: string | Date;
};

let savingTypeMigrationPromise: Promise<void> | null = null;

const toDateInput = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const toPeriode = (value: Date | string) => toDateInput(value).slice(0, 7);

async function ensureSavingTypes(connection: PoolConnection) {
  if (!savingTypeMigrationPromise) {
    savingTypeMigrationPromise = (async () => {
      await connection.query(
        "ALTER TABLE simpanan MODIFY jenis_simpanan VARCHAR(50) NOT NULL",
      );
      await connection.query(
        "UPDATE simpanan SET jenis_simpanan = 'wajib' WHERE jenis_simpanan = 'pokok'",
      );
      await connection.query(
        "ALTER TABLE simpanan MODIFY jenis_simpanan ENUM('wajib', 'lebaran', 'pendidikan', 'sukarela') NOT NULL",
      );
      await connection.query(
        "ALTER TABLE simpanan MODIFY status ENUM('aktif', 'nonaktif', 'ditarik') DEFAULT 'aktif'",
      );
      await connection.query(`
        INSERT IGNORE INTO rekening
          (kode_rekening, nama_rekening, deskripsi, kategori, tipe_normal, status, tanggal_buat)
        VALUES
          ('2-1400', 'Simpanan Sukarela', 'Simpanan sukarela anggota', 'liabilitas', 'kredit', 'aktif', CURDATE())
      `).catch(() => undefined);
    })();
  }

  await savingTypeMigrationPromise;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id_anggota = searchParams.get("id_anggota");

    const connection = await pool.getConnection();
    await ensureSavingTypes(connection);

    let query = `
      SELECT s.*, a.nama, a.no_anggota, a.status_pekerjaan 
      FROM simpanan s 
      JOIN anggota a ON s.id_anggota = a.id
    `;
    const params: string[] = [];

    if (id_anggota) {
      query += " WHERE s.id_anggota = ?";
      params.push(id_anggota);
    }

    query += " ORDER BY s.tanggal_simpanan DESC";

    const [simpanan] = await connection.query(query, params);
    connection.release();

    return NextResponse.json({
      success: true,
      data: simpanan,
    });
  } catch (error) {
    console.error("Get simpanan error:", error);
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
      jenis_simpanan,
      jumlah,
      tanggal_simpanan,
      status,
      idPengguna,
    } = await request.json();
    const savingDate = tanggal_simpanan || new Date();

    const connection = await pool.getConnection();
    try {
      await ensureSavingTypes(connection);
      await connection.beginTransaction();

      // Insert ke tabel simpanan
      const [result] = await connection.query<ResultSetHeader>(
        "INSERT INTO simpanan (id_anggota, jenis_simpanan, jumlah, tanggal_simpanan, status) VALUES (?, ?, ?, ?, ?)",
        [id_anggota, jenis_simpanan, jumlah, savingDate, status || "aktif"],
      );
      const idSimpanan = result.insertId;

      // Legacy: Insert ke transaksi_lain untuk backward compatibility
      await addBalancedJournal(
        connection,
        savingJournal(Number(id_anggota), jenis_simpanan, Number(jumlah)),
      );

      // Modern: Create journal entry ke jurnal_umum system
      // Get current period (YYYY-MM)
      const periode = toPeriode(savingDate);

      const modernJournal = createSavingJournalEntry(
        Number(id_anggota),
        jenis_simpanan as "wajib" | "lebaran" | "pendidikan" | "sukarela",
        Number(jumlah),
        savingDate,
        periode,
        idPengguna || 1,
        idSimpanan,
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
      message: "Simpanan berhasil ditambahkan (dicatat ke jurnal akuntansi)",
    });
  } catch (error) {
    console.error("Create simpanan error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      id_anggota,
      jenis_simpanan,
      jumlah,
      tanggal_simpanan,
      status,
      idPengguna,
    } = await request.json();

    const connection = await pool.getConnection();
    try {
      await ensureSavingTypes(connection);
      await connection.beginTransaction();

      const updateValues: Array<string | number> = [
        id_anggota,
        jenis_simpanan,
        jumlah,
      ];
      let updateQuery =
        "UPDATE simpanan SET id_anggota = ?, jenis_simpanan = ?, jumlah = ?";

      if (tanggal_simpanan) {
        updateQuery += ", tanggal_simpanan = ?";
        updateValues.push(tanggal_simpanan);
      }

      updateQuery += ", status = ? WHERE id = ?";
      updateValues.push(status, id);

      await connection.query(updateQuery, updateValues);

      const [rows] = await connection.query<SimpananJournalRow[]>(
        "SELECT id_anggota, jenis_simpanan, jumlah, tanggal_simpanan FROM simpanan WHERE id = ? LIMIT 1",
        [id],
      );
      const simpanan = rows[0];
      if (!simpanan) {
        await connection.rollback();
        return NextResponse.json(
          { success: false, error: "Simpanan tidak ditemukan" },
          { status: 404 },
        );
      }

      await replaceJournalEntryByReference(
        connection,
        {
          tipeJurnal: "simpanan",
          idReferensi: Number(id),
          deskripsiPrefix: "Setoran Simpanan",
        },
        createSavingJournalEntry(
          Number(simpanan.id_anggota),
          simpanan.jenis_simpanan,
          Number(simpanan.jumlah),
          simpanan.tanggal_simpanan,
          toPeriode(simpanan.tanggal_simpanan),
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
      message: "Simpanan berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update simpanan error:", error);
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
        tipeJurnal: "simpanan",
        idReferensi: Number(id),
        deskripsiPrefix: "Setoran Simpanan",
      });
      await connection.query("DELETE FROM simpanan WHERE id = ?", [id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return NextResponse.json({
      success: true,
      message: "Simpanan berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete simpanan error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
