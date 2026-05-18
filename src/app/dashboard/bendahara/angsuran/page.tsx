"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { exportToExcel } from "@/lib/export";
import BendaharaSidebar from "@/components/BendaharaSidebar";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

interface AngsuranItem {
  id: number;
  id_pinjaman: number;
  id_anggota: number;
  nama: string;
  no_anggota: string;
  jumlah_pinjam: number;
  sisa_pinjaman: number;
  tanggal_tagih: number;
  jumlah_bayar: number;
  tanggal_bayar: string;
  keterangan: string | null;
}

interface AnggotaItem {
  id: number;
  nama: string;
}

const monthOptions = [
  { value: "semua", label: "Semua bulan" },
  { value: "0", label: "Januari" },
  { value: "1", label: "Februari" },
  { value: "2", label: "Maret" },
  { value: "3", label: "April" },
  { value: "4", label: "Mei" },
  { value: "5", label: "Juni" },
  { value: "6", label: "Juli" },
  { value: "7", label: "Agustus" },
  { value: "8", label: "September" },
  { value: "9", label: "Oktober" },
  { value: "10", label: "November" },
  { value: "11", label: "Desember" },
];

const formatMoney = (value: number) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const makeLocalDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
};

export default function BendaharaAngsuranPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [angsuran, setAngsuran] = useState<AngsuranItem[]>([]);
  const [anggotaMap, setAnggotaMap] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [nasabahFilter, setNasabahFilter] = useState("semua");
  const [monthFilter, setMonthFilter] = useState("semua");
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) return void router.push("/");
    if (currentUser.role !== "bendahara") return void router.push("/dashboard");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(currentUser);

    Promise.all([fetch("/api/pembayaran-pinjaman"), fetch("/api/anggota")])
      .then(async ([angsuranRes, anggotaRes]) => {
        const angsuranData = await angsuranRes.json();
        const anggotaData = await anggotaRes.json();

        if (angsuranData.success) setAngsuran(angsuranData.data);
        if (anggotaData.success) {
          const map = (anggotaData.data as AnggotaItem[]).reduce(
            (acc, item) => {
              acc[item.id] = item.nama;
              return acc;
            },
            {} as Record<number, string>,
          );
          setAnggotaMap(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const nasabahOptions = useMemo(() => {
    const map = new Map<number, string>();
    angsuran.forEach((item) => {
      map.set(item.id_anggota, item.nama || anggotaMap[item.id_anggota] || `Nasabah ${item.id_anggota}`);
    });
    return Array.from(map, ([id, nama]) => ({ id, nama }));
  }, [anggotaMap, angsuran]);

  const yearOptions = useMemo(() => {
    const years = new Set(
      angsuran.map((item) => String(makeLocalDate(item.tanggal_bayar).getFullYear())),
    );
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [angsuran]);

  const filteredRows = useMemo(() => {
    return angsuran.filter((item) => {
      const paymentDate = makeLocalDate(item.tanggal_bayar);
      const name = item.nama || anggotaMap[item.id_anggota] || "";
      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        `P-${item.id_pinjaman}`.toLowerCase().includes(search.toLowerCase());
      const matchesNasabah =
        nasabahFilter === "semua" || String(item.id_anggota) === nasabahFilter;

      const matchesMonth =
        monthFilter === "semua" || paymentDate.getMonth() === Number(monthFilter);
      const matchesYear =
        yearFilter === "semua" || paymentDate.getFullYear() === Number(yearFilter);

      return matchesSearch && matchesNasabah && matchesMonth && matchesYear;
    });
  }, [anggotaMap, angsuran, monthFilter, nasabahFilter, search, yearFilter]);

  const buildExportRows = () =>
    filteredRows.map((item) => ({
      Tanggal: new Date(item.tanggal_bayar).toLocaleDateString("id-ID"),
      Nasabah: item.nama || anggotaMap[item.id_anggota] || "-",
      "No Anggota": item.no_anggota || "-",
      Pinjaman: `P-${item.id_pinjaman}`,
      "Bayar Pokok": Number(item.jumlah_bayar || 0),
      "Sisa Pokok": Number(item.sisa_pinjaman || 0),
      "Tanggal Tagih": item.tanggal_tagih || "-",
      Keterangan: item.keterangan || "Angsuran pinjaman",
    }));

  const handleExportExcel = () => {
    exportToExcel(buildExportRows(), "Angsuran", "laporan-angsuran.xlsx");
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape" });
    const rows = buildExportRows();

    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 297, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Laporan Angsuran Pinjaman", 14, 17);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(
      `Filter nasabah: ${nasabahFilter === "semua" ? "Semua" : nasabahOptions.find((item) => String(item.id) === nasabahFilter)?.nama || "-"}`,
      14,
      38,
    );
    doc.text(
      `Periode: ${monthOptions.find((item) => item.value === monthFilter)?.label || "Semua bulan"} ${yearFilter === "semua" ? "" : yearFilter}`,
      14,
      44,
    );
    doc.text(`Total pembayaran pokok: ${formatMoney(totalPembayaran)}`, 14, 50);

    const headers = ["Tanggal", "Nasabah", "No Anggota", "Pinjaman", "Bayar Pokok", "Sisa Pokok", "Tagih", "Keterangan"];
    const widths = [25, 42, 32, 22, 35, 35, 18, 58];
    let y = 62;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 7, 269, 10, "F");
    doc.setFontSize(8);
    let x = 16;
    headers.forEach((header, index) => {
      doc.text(header, x, y);
      x += widths[index];
    });

    y += 9;
    rows.forEach((row) => {
      if (y > 190) {
        doc.addPage();
        y = 18;
      }
      x = 16;
      [
        row.Tanggal,
        row.Nasabah,
        row["No Anggota"],
        row.Pinjaman,
        formatMoney(row["Bayar Pokok"]),
        formatMoney(row["Sisa Pokok"]),
        String(row["Tanggal Tagih"]),
        row.Keterangan,
      ].forEach((value, index) => {
        doc.text(String(value).slice(0, 32), x, y);
        x += widths[index];
      });
      y += 8;
    });

    doc.save("laporan-angsuran.pdf");
  };

  const totalPembayaran = filteredRows.reduce(
    (sum, item) => sum + Number(item.jumlah_bayar || 0),
    0,
  );
  const totalSisaPokok = filteredRows.reduce(
    (sum, item) => sum + Number(item.sisa_pinjaman || 0),
    0,
  );

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat data angsuran...
      </div>
    );

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Angsuran Bendahara</p>
                <h1 className="text-2xl font-bold text-slate-900">Riwayat Angsuran</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Halaman ini menampilkan pembayaran pokok yang sudah masuk.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Export Excel
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nasabah atau ID pinjaman..."
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
              />
              <select
                value={nasabahFilter}
                onChange={(event) => setNasabahFilter(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
              >
                <option value="semua">Semua nasabah</option>
                {nasabahOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama}
                  </option>
                ))}
              </select>
              <select
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
              >
                {monthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
              >
                <option value="semua">Semua tahun</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {[
              ["Transaksi", filteredRows.length.toLocaleString("id-ID")],
              ["Total Bayar Pokok", formatMoney(totalPembayaran)],
              ["Total Sisa Pokok", formatMoney(totalSisaPokok)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Riwayat Pembayaran Pokok</h2>
              <p className="text-sm text-slate-500">
                Pembayaran di sini mengurangi sisa pokok. Bunga tidak ikut mengurangi sisa pokok.
              </p>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Nama Nasabah</th>
                    <th className="px-6 py-4">Pinjaman</th>
                    <th className="px-6 py-4">Bayar Pokok</th>
                    <th className="px-6 py-4">Sisa Pokok</th>
                    <th className="px-6 py-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : filteredRows.slice(0, 20)).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                        {new Date(item.tanggal_bayar).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {item.nama || anggotaMap[item.id_anggota] || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-700">P-{item.id_pinjaman}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-900">
                        {formatMoney(item.jumlah_bayar)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-emerald-700">
                        {formatMoney(Number(item.sisa_pinjaman ?? 0))}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{item.keterangan || "Angsuran pinjaman"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
