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

interface PinjamanItem {
  id: number;
  id_anggota: number;
  nama: string;
  jumlah_pinjam: number;
  jumlah_bunga: number;
  jangka_waktu: number;
  tanggal_pinjam: string;
  tanggal_mulai: string;
  tanggal_tagih: number;
  total_bayar_pokok: number;
  sisa_pinjaman: number;
  status: string;
}

interface NasabahItem {
  id: number;
  nama: string;
  no_anggota: string;
}

const periodOptions = [
  { value: "semua", label: "Semua periode" },
  { value: "bulan-ini", label: "Bulan ini" },
  { value: "bulan-lalu", label: "Bulan lalu" },
  { value: "tahun-ini", label: "Tahun ini" },
];

const formatMoney = (value: number) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const makeLocalDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const daysInMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate();

const makeDueDate = (year: number, monthIndex: number, dueDay: number) =>
  new Date(year, monthIndex, Math.min(Math.max(dueDay, 1), daysInMonth(year, monthIndex)));

const getFirstDueDate = (startValue: string, dueDay: number) => {
  const startDate = makeLocalDate(startValue);
  const sameMonthDue = makeDueDate(startDate.getFullYear(), startDate.getMonth(), dueDay);
  if (sameMonthDue <= startDate) {
    return makeDueDate(startDate.getFullYear(), startDate.getMonth() + 1, dueDay);
  }
  return sameMonthDue;
};

const getCurrentDueDate = (startValue: string, dueDay: number, asOfValue: string) => {
  const firstDue = getFirstDueDate(startValue, dueDay);
  const asOf = makeLocalDate(asOfValue);
  const monthDue = makeDueDate(asOf.getFullYear(), asOf.getMonth(), dueDay);

  if (monthDue < firstDue) return firstDue;
  if (asOf > monthDue) return monthDue;

  const previousDue = makeDueDate(asOf.getFullYear(), asOf.getMonth() - 1, dueDay);
  if (previousDue >= firstDue && asOf > previousDue && asOf < monthDue) return monthDue;

  return monthDue;
};

const getDueDatesInRange = (
  startValue: string,
  dueDay: number,
  tenor: number,
  rangeStartValue: string,
  rangeEndValue: string,
) => {
  const firstDue = getFirstDueDate(startValue, dueDay);
  const rangeStart = makeLocalDate(rangeStartValue);
  const rangeEnd = makeLocalDate(rangeEndValue);
  const dueDates: Date[] = [];

  for (let index = 0; index < Number(tenor || 0); index += 1) {
    const dueDate = makeDueDate(
      firstDue.getFullYear(),
      firstDue.getMonth() + index,
      dueDay,
    );
    if (dueDate > rangeEnd) break;
    if (dueDate >= rangeStart && dueDate <= rangeEnd) {
      dueDates.push(dueDate);
    }
  }

  return dueDates;
};

export default function BendaharaPinjamanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [pinjaman, setPinjaman] = useState<PinjamanItem[]>([]);
  const [nasabah, setNasabah] = useState<NasabahItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTambahModal, setShowTambahModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PinjamanItem | null>(null);
  const [search, setSearch] = useState("");
  const [nasabahFilter, setNasabahFilter] = useState("semua");
  const [periodFilter, setPeriodFilter] = useState("semua");
  const [billingStartDate, setBillingStartDate] = useState(() => toDateInput(new Date()));
  const [billingEndDate, setBillingEndDate] = useState(() => toDateInput(new Date()));
  const [simulation, setSimulation] = useState({
    jumlah_pinjam: "",
    jangka_waktu: "",
  });
  const [formData, setFormData] = useState({
    id_anggota: "",
    jumlah_pinjam: "",
    jumlah_bunga: "",
    jangka_waktu: "",
    tanggal_mulai: "",
    tanggal_tagih: "",
    status: "aktif",
  });

  const hitungBungaBulanan = (jumlahPinjam: number) => jumlahPinjam * 0.014;

  const hitungAngsuran = (jumlahPinjam: number, tenor: number) => {
    if (!jumlahPinjam || !tenor) return 0;
    return jumlahPinjam / tenor + hitungBungaBulanan(jumlahPinjam);
  };

  const expectedPrincipal = (item: PinjamanItem) => {
    const principal = Number(item.jumlah_pinjam || 0);
    const tenor = Number(item.jangka_waktu || 1);
    const remaining = Number(item.sisa_pinjaman ?? principal);
    return Math.min(Math.ceil(principal / tenor), remaining);
  };

  const getBillingStatus = (item: PinjamanItem) => {
    const remaining = Number(item.sisa_pinjaman ?? item.jumlah_pinjam);
    if (remaining <= 0) {
      return {
        label: "Lunas",
        tone: "bg-slate-100 text-slate-700",
        border: "border-slate-200",
      };
    }

    const dueDatesInRange = getDueDatesInRange(
      item.tanggal_mulai || item.tanggal_pinjam,
      Number(item.tanggal_tagih || 1),
      Number(item.jangka_waktu || 0),
      billingStartDate,
      billingEndDate,
    );

    if (dueDatesInRange.length > 0) {
      return {
        label: dueDatesInRange.length > 1 ? `${dueDatesInRange.length}x ditagih` : "Masuk rentang tagih",
        tone: "bg-emerald-100 text-emerald-700",
        border: "border-emerald-300",
      };
    }

    const dueDate = getCurrentDueDate(
      item.tanggal_mulai || item.tanggal_pinjam,
      Number(item.tanggal_tagih || 1),
      billingEndDate,
    );
    const asOf = makeLocalDate(billingEndDate);

    if (asOf > dueDate) {
      return {
        label: "Lewat jatuh tempo",
        tone: "bg-rose-100 text-rose-700",
        border: "border-rose-300",
      };
    }

    return {
      label: `Akan ditagih ${dueDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })}`,
      tone: "bg-amber-100 text-amber-700",
      border: "border-amber-300",
    };
  };

  const calculatedInterest = hitungBungaBulanan(Number(formData.jumlah_pinjam || 0));
  const calculatedInstallment = hitungAngsuran(
    Number(formData.jumlah_pinjam || 0),
    Number(formData.jangka_waktu || 0),
  );
  const simulationPrincipal = Number(simulation.jumlah_pinjam || 0);
  const simulationTenor = Number(simulation.jangka_waktu || 0);
  const simulationInterest = hitungBungaBulanan(simulationPrincipal);
  const simulationInstallment = hitungAngsuran(simulationPrincipal, simulationTenor);
  const simulationTotalPayment = simulationInstallment * simulationTenor;

  const loadData = async () => {
    try {
      const [response, nasabahResponse] = await Promise.all([
        fetch("/api/pinjaman"),
        fetch("/api/anggota"),
      ]);
      const data = await response.json();
      const nasabahData = await nasabahResponse.json();
      if (data.success) setPinjaman(data.data);
      if (nasabahData.success) setNasabah(nasabahData.data);
    } catch (error) {
      console.error("Error fetching pinjaman:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) return void router.push("/");
    if (currentUser.role !== "bendahara") return void router.push("/dashboard");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(currentUser);
    loadData();
  }, [router]);

  const filteredRows = useMemo(() => {
    const now = new Date();
    return pinjaman.filter((item) => {
      const sourceDate = makeLocalDate(item.tanggal_mulai || item.tanggal_pinjam);
      const matchesSearch =
        item.nama.toLowerCase().includes(search.toLowerCase()) ||
        `P-${item.id}`.toLowerCase().includes(search.toLowerCase());
      const matchesNasabah =
        nasabahFilter === "semua" || String(item.id_anggota) === nasabahFilter;

      let matchesPeriod = true;
      if (periodFilter === "bulan-ini") {
        matchesPeriod =
          sourceDate.getMonth() === now.getMonth() &&
          sourceDate.getFullYear() === now.getFullYear();
      } else if (periodFilter === "bulan-lalu") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        matchesPeriod =
          sourceDate.getMonth() === lastMonth.getMonth() &&
          sourceDate.getFullYear() === lastMonth.getFullYear();
      } else if (periodFilter === "tahun-ini") {
        matchesPeriod = sourceDate.getFullYear() === now.getFullYear();
      }

      return matchesSearch && matchesNasabah && matchesPeriod;
    });
  }, [nasabahFilter, periodFilter, pinjaman, search]);

  const activeLoans = filteredRows.filter(
    (item) => Number(item.sisa_pinjaman ?? item.jumlah_pinjam) > 0,
  );
  const dueToday = activeLoans.filter(
    (item) =>
      getDueDatesInRange(
        item.tanggal_mulai || item.tanggal_pinjam,
        Number(item.tanggal_tagih || 1),
        Number(item.jangka_waktu || 0),
        billingStartDate,
        billingEndDate,
      ).length > 0,
  );
  const overdue = activeLoans.filter(
    (item) => getBillingStatus(item).label === "Lewat jatuh tempo",
  );
  const dueTodayPrincipal = dueToday.reduce((sum, item) => {
    const dueCount = getDueDatesInRange(
      item.tanggal_mulai || item.tanggal_pinjam,
      Number(item.tanggal_tagih || 1),
      Number(item.jangka_waktu || 0),
      billingStartDate,
      billingEndDate,
    ).length;
    return sum + expectedPrincipal(item) * dueCount;
  }, 0);
  const dueTodayInstallment = dueToday.reduce(
    (sum, item) => {
      const dueCount = getDueDatesInRange(
        item.tanggal_mulai || item.tanggal_pinjam,
        Number(item.tanggal_tagih || 1),
        Number(item.jangka_waktu || 0),
        billingStartDate,
        billingEndDate,
      ).length;
      return sum + hitungAngsuran(
        Number(item.jumlah_pinjam || 0),
        Number(item.jangka_waktu || 0),
      ) * dueCount;
    },
    0,
  );

  const resetForm = () =>
    setFormData({
      id_anggota: "",
      jumlah_pinjam: "",
      jumlah_bunga: "",
      jangka_waktu: "",
      tanggal_mulai: "",
      tanggal_tagih: "",
      status: "aktif",
    });

  const buildExportRows = () =>
    filteredRows.map((item) => ({
      "ID Pinjaman": `P-${item.id}`,
      Nasabah: item.nama,
      "Total Pinjaman": Number(item.jumlah_pinjam || 0),
      "Bunga per Bulan": Number(item.jumlah_bunga || 0),
      Tenor: `${item.jangka_waktu} bulan`,
      "Tanggal Mulai": new Date(item.tanggal_mulai || item.tanggal_pinjam).toLocaleDateString("id-ID"),
      "Tanggal Tagih": item.tanggal_tagih || 1,
      "Sisa Pokok": Number(item.sisa_pinjaman ?? item.jumlah_pinjam),
      "Angsuran per Bulan": hitungAngsuran(Number(item.jumlah_pinjam || 0), Number(item.jangka_waktu || 0)),
      "Jadwal Berikutnya": getCurrentDueDate(
        item.tanggal_mulai || item.tanggal_pinjam,
        Number(item.tanggal_tagih || 1),
        billingEndDate,
      ).toLocaleDateString("id-ID"),
      Status: getBillingStatus(item).label,
    }));

  const handleExportExcel = () => {
    exportToExcel(buildExportRows(), "Pinjaman", "laporan-pinjaman.xlsx");
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape" });
    const rows = buildExportRows();

    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 297, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Laporan Pinjaman Nasabah", 14, 17);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(`Filter nasabah: ${nasabahFilter === "semua" ? "Semua" : nasabah.find((item) => String(item.id) === nasabahFilter)?.nama || "-"}`, 14, 38);
    doc.text(`Periode: ${periodOptions.find((item) => item.value === periodFilter)?.label || "Semua"}`, 14, 44);
    doc.text(`Rentang tagih: ${new Date(billingStartDate).toLocaleDateString("id-ID")} - ${new Date(billingEndDate).toLocaleDateString("id-ID")}`, 14, 50);
    doc.text(`Masuk rentang tagih: ${dueToday.length} nasabah | Pokok: ${formatMoney(dueTodayPrincipal)} | Angsuran: ${formatMoney(dueTodayInstallment)}`, 14, 56);

    const headers = ["ID", "Nasabah", "Total", "Bunga", "Tenor", "Mulai", "Tagih", "Sisa", "Angsuran", "Status"];
    const widths = [15, 35, 28, 25, 20, 25, 18, 28, 30, 45];
    let y = 68;

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
        row["ID Pinjaman"],
        row.Nasabah,
        formatMoney(row["Total Pinjaman"]),
        formatMoney(row["Bunga per Bulan"]),
        row.Tenor,
        row["Tanggal Mulai"],
        String(row["Tanggal Tagih"]),
        formatMoney(row["Sisa Pokok"]),
        formatMoney(row["Angsuran per Bulan"]),
        row.Status,
      ].forEach((value, index) => {
        doc.text(String(value).slice(0, 28), x, y);
        x += widths[index];
      });
      y += 8;
    });

    doc.save("laporan-pinjaman.pdf");
  };

  const handleEdit = async (item: PinjamanItem) => {
    setEditingItem(item);
    setFormData({
      id_anggota: String(item.id_anggota),
      jumlah_pinjam: String(item.jumlah_pinjam),
      jumlah_bunga: String(item.jumlah_bunga),
      jangka_waktu: String(item.jangka_waktu),
      tanggal_mulai: item.tanggal_mulai?.slice(0, 10) || "",
      tanggal_tagih: String(item.tanggal_tagih || ""),
      status: item.status,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const response = await fetch("/api/pinjaman", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          id_anggota: Number(formData.id_anggota),
          jumlah_pinjam: Number(formData.jumlah_pinjam),
          jumlah_bunga: calculatedInterest,
          jangka_waktu: Number(formData.jangka_waktu),
          tanggal_mulai: formData.tanggal_mulai,
          tanggal_tagih: Number(formData.tanggal_tagih),
          status: formData.status,
        }),
      });
      if (response.ok) {
        loadData();
        setShowEditModal(false);
        setEditingItem(null);
        resetForm();
      }
    } catch (error) {
      console.error("Error updating pinjaman:", error);
    }
  };

  const handleDelete = async (item: PinjamanItem) => {
    if (!window.confirm(`Hapus pinjaman milik ${item.nama}?`)) return;

    try {
      const response = await fetch("/api/pinjaman", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (response.ok) loadData();
    } catch (error) {
      console.error("Error deleting pinjaman:", error);
    }
  };

  const handleTambahSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.id_anggota ||
      !formData.jumlah_pinjam ||
      !formData.jangka_waktu ||
      !formData.tanggal_mulai ||
      !formData.tanggal_tagih
    ) {
      return;
    }

    const response = await fetch("/api/pinjaman", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_anggota: Number(formData.id_anggota),
        jumlah_pinjam: Number(formData.jumlah_pinjam),
        jumlah_bunga: calculatedInterest,
        jangka_waktu: Number(formData.jangka_waktu),
        tanggal_mulai: formData.tanggal_mulai,
        tanggal_tagih: Number(formData.tanggal_tagih),
      }),
    });

    if (response.ok) {
      loadData();
      setShowTambahModal(false);
      resetForm();
    }
  };

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat data pinjaman...
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
                <p className="text-sm font-semibold text-slate-500">Pinjaman Bendahara</p>
                <h1 className="text-2xl font-bold text-slate-900">Data Pinjaman Nasabah</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Jadwal tagih otomatis mengikuti tanggal mulai dan tanggal tagih.
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
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowTambahModal(true);
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  + Tambah Pinjaman
                </button>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-emerald-700">Simulasi Pinjaman</p>
                <h2 className="text-lg font-bold text-slate-900">Hitung estimasi angsuran</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-600">Jumlah pinjaman</span>
                  <input
                    type="number"
                    min={0}
                    value={simulation.jumlah_pinjam}
                    onChange={(event) =>
                      setSimulation((current) => ({
                        ...current,
                        jumlah_pinjam: event.target.value,
                      }))
                    }
                    placeholder="Contoh: 10000000"
                    className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-slate-900"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-600">Jangka waktu</span>
                  <input
                    type="number"
                    min={1}
                    value={simulation.jangka_waktu}
                    onChange={(event) =>
                      setSimulation((current) => ({
                        ...current,
                        jangka_waktu: event.target.value,
                      }))
                    }
                    placeholder="Bulan"
                    className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm text-slate-900"
                  />
                </label>
                <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500">Bunga per bulan</p>
                  <p className="mt-1 font-bold text-slate-900">{formatMoney(simulationInterest)}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500">Angsuran per bulan</p>
                  <p className="mt-1 font-bold text-emerald-700">{formatMoney(simulationInstallment)}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-white px-4 py-3 text-sm">
                  <span className="text-slate-500">Pokok per bulan: </span>
                  <strong className="text-slate-900">
                    {formatMoney(simulationTenor ? simulationPrincipal / simulationTenor : 0)}
                  </strong>
                </div>
                <div className="rounded-xl bg-white px-4 py-3 text-sm">
                  <span className="text-slate-500">Total bunga: </span>
                  <strong className="text-slate-900">{formatMoney(simulationInterest * simulationTenor)}</strong>
                </div>
                <div className="rounded-xl bg-white px-4 py-3 text-sm">
                  <span className="text-slate-500">Total dibayar: </span>
                  <strong className="text-slate-900">{formatMoney(simulationTotalPayment)}</strong>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
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
                {nasabah.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama}
                  </option>
                ))}
              </select>
              <select
                value={periodFilter}
                onChange={(event) => setPeriodFilter(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
              >
                {periodOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <label className="flex flex-col gap-1 rounded-xl border border-slate-200 px-4 py-2">
                <span className="text-xs font-semibold text-slate-500">Dari tanggal</span>
                <input
                  type="date"
                  value={billingStartDate}
                  onChange={(event) => {
                    setBillingStartDate(event.target.value);
                    if (event.target.value > billingEndDate) {
                      setBillingEndDate(event.target.value);
                    }
                  }}
                  className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
                  aria-label="Dari tanggal tagihan"
                />
              </label>
              <label className="flex flex-col gap-1 rounded-xl border border-slate-200 px-4 py-2">
                <span className="text-xs font-semibold text-slate-500">Sampai tanggal</span>
                <input
                  type="date"
                  value={billingEndDate}
                  min={billingStartDate}
                  onChange={(event) => setBillingEndDate(event.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
                  aria-label="Sampai tanggal tagihan"
                />
              </label>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {[
              ["Pinjaman Aktif", activeLoans.length.toLocaleString("id-ID")],
              ["Masuk Rentang Tagih", dueToday.length.toLocaleString("id-ID")],
              ["Lewat Jatuh Tempo", overdue.length.toLocaleString("id-ID")],
              ["Estimasi Pokok Ditagih", formatMoney(dueTodayPrincipal)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(loading ? [] : filteredRows).slice(0, 9).map((item) => {
              const status = getBillingStatus(item);
              const dueDate = getCurrentDueDate(
                item.tanggal_mulai || item.tanggal_pinjam,
                Number(item.tanggal_tagih || 1),
                billingEndDate,
              );
              return (
                <div key={item.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${status.border}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.nama}</p>
                      <p className="text-xs text-slate-500">P-{item.id}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">Total Pinjaman</p>
                      <p className="font-bold text-slate-900">{formatMoney(item.jumlah_pinjam)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Sisa Pokok</p>
                      <p className="font-bold text-emerald-700">
                        {formatMoney(Number(item.sisa_pinjaman ?? item.jumlah_pinjam))}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Pokok per Tagihan</p>
                      <p className="font-bold text-slate-900">{formatMoney(expectedPrincipal(item))}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Bunga / Bulan</p>
                      <p className="font-bold text-slate-900">{formatMoney(item.jumlah_bunga)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Angsuran / Bulan</p>
                      <p className="font-bold text-emerald-700">
                        {formatMoney(hitungAngsuran(Number(item.jumlah_pinjam || 0), Number(item.jangka_waktu || 0)))}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Jadwal Berikutnya</p>
                      <p className="font-bold text-slate-900">{dueDate.toLocaleDateString("id-ID")}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="rounded-xl bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-200"
                    >
                      Edit Data
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {showTambahModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Tambah Pinjaman</h2>
            <form onSubmit={handleTambahSubmit} className="space-y-4">
              <select
                value={formData.id_anggota}
                onChange={(e) => setFormData({ ...formData, id_anggota: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                required
              >
                <option value="">Pilih nasabah simpan pinjam</option>
                {nasabah.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama} - {item.no_anggota}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={formData.jumlah_pinjam}
                onChange={(e) => setFormData({ ...formData, jumlah_pinjam: e.target.value })}
                placeholder="Jumlah pinjam"
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                required
              />
              <input
                type="number"
                value={calculatedInterest || ""}
                placeholder="Bunga otomatis 1,4% per bulan"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600"
                readOnly
              />
              <input
                type="number"
                value={formData.jangka_waktu}
                onChange={(e) => setFormData({ ...formData, jangka_waktu: e.target.value })}
                placeholder="Jangka waktu (bulan)"
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                required
              />
              <input
                type="date"
                value={formData.tanggal_mulai}
                onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                required
              />
              <input
                type="number"
                min={1}
                max={31}
                value={formData.tanggal_tagih}
                onChange={(e) => setFormData({ ...formData, tanggal_tagih: e.target.value })}
                placeholder="Ditagih tiap tanggal berapa"
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                required
              />
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Angsuran / bulan: {formatMoney(calculatedInstallment || 0)}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowTambahModal(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-slate-900">
                  Batal
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Edit Pinjaman</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <select
                value={formData.id_anggota}
                onChange={(e) => setFormData({ ...formData, id_anggota: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                required
              >
                <option value="">Pilih nasabah simpan pinjam</option>
                {nasabah.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama} - {item.no_anggota}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={formData.jumlah_pinjam}
                onChange={(e) => setFormData({ ...formData, jumlah_pinjam: e.target.value })}
                placeholder="Jumlah Pinjam"
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                required
              />
              <input
                type="number"
                value={calculatedInterest || ""}
                placeholder="Bunga otomatis 1,4% per bulan"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600"
                readOnly
              />
              <input
                type="number"
                value={formData.jangka_waktu}
                onChange={(e) => setFormData({ ...formData, jangka_waktu: e.target.value })}
                placeholder="Jangka Waktu (bulan)"
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                required
              />
              <input
                type="date"
                value={formData.tanggal_mulai}
                onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                required
              />
              <input
                type="number"
                min={1}
                max={31}
                value={formData.tanggal_tagih}
                onChange={(e) => setFormData({ ...formData, tanggal_tagih: e.target.value })}
                placeholder="Ditagih tiap tanggal berapa"
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                required
              />
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Angsuran / bulan: {formatMoney(calculatedInstallment || 0)}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
