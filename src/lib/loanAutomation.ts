import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { addBalancedJournal, installmentJournal } from "@/lib/accounting";

interface LoanRow extends RowDataPacket {
  id: number;
  id_anggota: number;
  jumlah_pinjam: number;
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

export async function runLoanPaymentAutomation(connection: PoolConnection) {
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [loans] = await connection.query<LoanRow[]>(`
    SELECT
      p.id,
      p.id_anggota,
      p.jumlah_pinjam,
      p.jangka_waktu,
      p.tanggal_mulai,
      p.tanggal_tagih,
      COALESCE(payments.total_bayar_pokok, 0) AS total_bayar_pokok
    FROM pinjaman p
    LEFT JOIN (
      SELECT id_pinjaman, SUM(jumlah_bayar) AS total_bayar_pokok
      FROM pembayaran_pinjaman
      GROUP BY id_pinjaman
    ) payments ON payments.id_pinjaman = p.id
    WHERE p.status = 'aktif'
  `);

  for (const loan of loans) {
    const principal = Number(loan.jumlah_pinjam || 0);
    const tenor = Number(loan.jangka_waktu || 1);
    let remaining = Math.max(principal - Number(loan.total_bayar_pokok || 0), 0);
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
        "SELECT id FROM pembayaran_pinjaman WHERE id_pinjaman = ? AND (tanggal_bayar = ? OR keterangan = ?) LIMIT 1",
        [loan.id, dueDateText, marker],
      );
      if (existingRows.length > 0) continue;

      const amount = Math.min(monthlyPrincipal, remaining);
      await connection.query(
        "INSERT INTO pembayaran_pinjaman (id_pinjaman, jumlah_bayar, tanggal_bayar, keterangan) VALUES (?, ?, ?, ?)",
        [loan.id, amount, dueDateText, marker],
      );
      await addBalancedJournal(
        connection,
        installmentJournal(Number(loan.id_anggota), amount).map((line) => ({
          ...line,
          date: dueDateText,
          description: `${line.description} otomatis`,
        })),
      );

      remaining -= amount;
    }

    if (remaining <= 0) {
      await connection.query("UPDATE pinjaman SET status = 'lunas' WHERE id = ?", [loan.id]);
    }
  }
}
