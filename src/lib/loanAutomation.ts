import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

interface LoanRow extends RowDataPacket {
  id: number;
  id_anggota: number;
  jumlah_pinjam: number;
  jumlah_bunga: number | null;
  jangka_waktu: number;
  tanggal_mulai: string | Date;
  tanggal_tagih: number;
  total_bayar_pokok: number | null;
}

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toLocalDate = (value: string | Date) => {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const daysInMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate();

const makeDueDate = (year: number, monthIndex: number, dueDay: number) =>
  new Date(year, monthIndex, Math.min(Math.max(dueDay, 1), daysInMonth(year, monthIndex)));

const getFirstDueDate = (startValue: string | Date, dueDay: number) => {
  const startDate = toLocalDate(startValue);
  const sameMonthDue = makeDueDate(startDate.getFullYear(), startDate.getMonth(), dueDay);
  if (sameMonthDue <= startDate) {
    return makeDueDate(startDate.getFullYear(), startDate.getMonth() + 1, dueDay);
  }
  return sameMonthDue;
};

export async function ensureLoanPaymentApprovalColumns(connection: PoolConnection) {
  const [columns] = await connection.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pembayaran_pinjaman' AND COLUMN_NAME IN ('status_approval', 'tanggal_disetujui', 'id_approver')",
  );
  const existing = new Set(columns.map((column) => String(column.COLUMN_NAME)));

  if (!existing.has("status_approval")) {
    await connection.query(
      "ALTER TABLE pembayaran_pinjaman ADD COLUMN status_approval ENUM('pending', 'approved', 'failed') NOT NULL DEFAULT 'approved' AFTER keterangan",
    );
  }

  if (!existing.has("tanggal_disetujui")) {
    await connection.query(
      "ALTER TABLE pembayaran_pinjaman ADD COLUMN tanggal_disetujui DATETIME NULL AFTER status_approval",
    );
  }

  if (!existing.has("id_approver")) {
    await connection.query(
      "ALTER TABLE pembayaran_pinjaman ADD COLUMN id_approver INT NULL AFTER tanggal_disetujui",
    );
  }
}

export const approvedPaymentCondition = "(pp.status_approval IS NULL OR pp.status_approval = 'approved')";

export async function runLoanPaymentAutomation(connection: PoolConnection) {
  await ensureLoanPaymentApprovalColumns(connection);

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [loans] = await connection.query<LoanRow[]>(`
    SELECT
      p.id,
      p.id_anggota,
      p.jumlah_pinjam,
      p.jumlah_bunga,
      p.jangka_waktu,
      p.tanggal_mulai,
      p.tanggal_tagih,
      COALESCE(payments.total_bayar_pokok, 0) AS total_bayar_pokok
    FROM pinjaman p
    LEFT JOIN (
      SELECT id_pinjaman, SUM(jumlah_bayar) AS total_bayar_pokok
      FROM pembayaran_pinjaman
      WHERE status_approval = 'approved'
      GROUP BY id_pinjaman
    ) payments ON payments.id_pinjaman = p.id
    WHERE p.status = 'aktif'
  `);

  for (const loan of loans) {
    const principal = Number(loan.jumlah_pinjam || 0);
    const tenor = Number(loan.jangka_waktu || 1);
    const remaining = Math.max(principal - Number(loan.total_bayar_pokok || 0), 0);
    if (remaining <= 0) continue;

    const monthlyPrincipal = Math.ceil(principal / tenor);
    const firstDue = getFirstDueDate(loan.tanggal_mulai, Number(loan.tanggal_tagih || 1));

    for (let index = 0; index < tenor; index += 1) {
      const dueDate = makeDueDate(
        firstDue.getFullYear(),
        firstDue.getMonth() + index,
        Number(loan.tanggal_tagih || 1),
      );
      if (dueDate > todayOnly || remaining <= 0) break;

      const dueDateText = formatDate(dueDate);
      const marker = `AUTO-PINJAMAN-${loan.id}-${dueDateText}`;
      const [existingRows] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM pembayaran_pinjaman WHERE id_pinjaman = ? AND (tanggal_bayar = ? OR keterangan LIKE ?) LIMIT 1",
        [loan.id, dueDateText, `%${marker}%`],
      );
      if (existingRows.length > 0) continue;

      const amount = Math.min(monthlyPrincipal, remaining);
      await connection.query<ResultSetHeader>(
        `INSERT INTO pembayaran_pinjaman
          (id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan, status_approval)
         VALUES (?, ?, ?, ?, 'pending')`,
        [loan.id, amount, dueDateText, `${marker} - menunggu approval`],
      );
    }

    if (remaining <= 0) {
      await connection.query("UPDATE pinjaman SET status = 'lunas' WHERE id = ?", [loan.id]);
    }
  }
}
