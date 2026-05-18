import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { 
  addBalancedJournal, 
  savingJournal,
  postJournalEntry,
  createSavingJournalEntry 
} from "@/lib/accounting";
import type { PoolConnection, ResultSetHeader } from "mysql2/promise";

let savingTypeMigrationPromise: Promise<void> | null = null;

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
    const { id_anggota, jenis_simpanan, jumlah, status, idPengguna } = await request.json();

    const connection = await pool.getConnection();
    try {
      await ensureSavingTypes(connection);
      await connection.beginTransaction();

      // Insert ke tabel simpanan
      const [result] = await connection.query<ResultSetHeader>(
        "INSERT INTO simpanan (id_anggota, jenis_simpanan, jumlah, tanggal_simpanan, status) VALUES (?, ?, ?, NOW(), ?)",
        [id_anggota, jenis_simpanan, jumlah, status || "aktif"],
      );
      const idSimpanan = result.insertId;

      // Legacy: Insert ke transaksi_lain untuk backward compatibility
      await addBalancedJournal(
        connection,
        savingJournal(Number(id_anggota), jenis_simpanan, Number(jumlah)),
      );

      // Modern: Create journal entry ke jurnal_umum system
      // Get current period (YYYY-MM)
      const now = new Date();
      const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      try {
        const modernJournal = createSavingJournalEntry(
          Number(id_anggota),
          jenis_simpanan as "wajib" | "lebaran" | "pendidikan" | "sukarela",
          Number(jumlah),
          now,
          periode,
          idPengguna || 1,
          idSimpanan,
        );

        await postJournalEntry(connection, modernJournal);
      } catch (journalError) {
        // Log journal error tapi jangan rollback transaksi simpanan
        console.warn("Modern journal entry failed (non-blocking):", journalError);
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
    const { id, id_anggota, jenis_simpanan, jumlah, status } =
      await request.json();

    const connection = await pool.getConnection();
    await ensureSavingTypes(connection);
    await connection.query(
      "UPDATE simpanan SET id_anggota = ?, jenis_simpanan = ?, jumlah = ?, status = ? WHERE id = ?",
      [id_anggota, jenis_simpanan, jumlah, status, id],
    );
    connection.release();

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
    await connection.query("DELETE FROM simpanan WHERE id = ?", [id]);
    connection.release();

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
