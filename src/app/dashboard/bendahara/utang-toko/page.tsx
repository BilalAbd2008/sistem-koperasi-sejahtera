"use client";

import { useEffect, useMemo, useState } from "react";
import { FinancialReportShell } from "@/components/accounting";
import { exportToExcel } from "@/lib/export";

interface MemberItem {
  id: number;
  no_anggota: string;
  nama: string;
}

interface StoreDebt {
  id: number;
  id_anggota: number;
  no_anggota: string;
  nama: string;
  status_pekerjaan: string | null;
  bulan: string;
  jumlah: number;
  status: string;
}

const formatMoney = (value: number) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const formatMonth = (value: string) => {
  if (!value) return "-";
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(
    "id-ID",
    {
      month: "long",
      year: "numeric",
    },
  );
};

export default function BendaharaUtangTokoPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [rows, setRows] = useState<StoreDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState("semua");
  const [yearFilter, setYearFilter] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [formData, setFormData] = useState({
    id_anggota: "",
    bulan: new Date().toISOString().slice(0, 7),
    jumlah: "",
  });

  const filteredRows = useMemo(() => {
    const query = search.toLowerCase();
    return rows.filter((item) => {
      const [year, month] = item.bulan.split("-");
      const matchesSearch =
        item.nama.toLowerCase().includes(query) ||
        item.no_anggota.toLowerCase().includes(query);
      const matchesMonth = monthFilter === "semua" || month === monthFilter;
      const matchesYear = yearFilter === "semua" || year === yearFilter;
      const statusNasabah = item.status_pekerjaan || "-";
      const matchesStatus =
        statusFilter === "semua" || statusNasabah === statusFilter;

      return matchesSearch && matchesMonth && matchesYear && matchesStatus;
    });
  }, [monthFilter, rows, search, statusFilter, yearFilter]);

  const yearOptions = useMemo(() => {
    const years = new Set(rows.map((item) => item.bulan.slice(0, 4)));
    years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(
      rows.map((item) => item.status_pekerjaan || "-"),
    );
    return Array.from(statuses).sort();
  }, [rows]);

  const totalDebt = useMemo(
    () => filteredRows.reduce((sum, item) => sum + Number(item.jumlah || 0), 0),
    [filteredRows],
  );
  const totalMembers = useMemo(
    () => new Set(filteredRows.map((item) => item.id_anggota)).size,
    [filteredRows],
  );
  const filteredMemberOptions = useMemo(() => {
    const query = memberQuery.toLowerCase();
    return members.filter(
      (member) =>
        member.nama.toLowerCase().includes(query) ||
        member.no_anggota.toLowerCase().includes(query),
    );
  }, [memberQuery, members]);

  const chooseMember = (member: MemberItem) => {
    setFormData({ ...formData, id_anggota: String(member.id) });
    setMemberQuery(`${member.nama} - ${member.no_anggota}`);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [memberResponse, debtResponse] = await Promise.all([
        fetch("/api/anggota"),
        fetch("/api/utang-toko"),
      ]);
      const memberResult = await memberResponse.json();
      const debtResult = await debtResponse.json();

      if (memberResult.success) {
        setMembers(memberResult.data);
      }
      if (debtResult.success) {
        setRows(debtResult.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.id_anggota || !formData.bulan || !formData.jumlah) return;

    setSaving(true);
    try {
      const response = await fetch("/api/utang-toko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_anggota: Number(formData.id_anggota),
          bulan: formData.bulan,
          jumlah: Number(formData.jumlah),
        }),
      });

      if (response.ok) {
        setFormData({
          id_anggota: "",
          bulan: formData.bulan,
          jumlah: "",
        });
        setMemberQuery("");
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (id: number) => {
    if (!window.confirm("Hapus data utang toko ini?")) return;

    const response = await fetch("/api/utang-toko", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (response.ok) {
      await loadData();
    }
  };

  const buildExportRows = () =>
    filteredRows.map((item) => ({
      "No Anggota": item.no_anggota,
      "Nama Anggota": item.nama,
      Bulan: formatMonth(item.bulan),
      "Jumlah Utang": Number(item.jumlah || 0),
      Status: item.status_pekerjaan || "-",
    }));

  const handleExportExcel = () => {
    exportToExcel(buildExportRows(), "Utang Toko", `utang_toko_${monthFilter}_${yearFilter}_${statusFilter}.xlsx`);
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const exportRows = buildExportRows();

    doc.setFillColor(5, 150, 105);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Laporan Utang Toko", margin, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Dicetak ${new Date().toLocaleString("id-ID")}`, margin, 17);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Total Utang: ${formatMoney(totalDebt)}`, margin, 34);
    doc.text(`Anggota Tercatat: ${totalMembers}`, margin + 70, 34);
    doc.text(
      `Filter: ${monthFilter === "semua" ? "Semua bulan" : monthFilter}/${yearFilter} | ${statusFilter}`,
      margin + 132,
      34,
    );

    const headers = ["No", "No Anggota", "Nama", "Bulan", "Jumlah", "Status"];
    const widths = [14, 34, 60, 38, 44, 28];
    let y = 48;
    let x = margin + 2;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 7, pageWidth - margin * 2, 10, "F");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    headers.forEach((header, index) => {
      doc.text(header, x, y);
      x += widths[index];
    });

    y += 9;
    exportRows.forEach((row, index) => {
      if (y > 190) {
        doc.addPage();
        y = 18;
      }
      x = margin + 2;
      [
        String(index + 1),
        row["No Anggota"],
        row["Nama Anggota"],
        row.Bulan,
        formatMoney(row["Jumlah Utang"]),
        row.Status,
      ].forEach((value, columnIndex) => {
        doc.text(String(value).slice(0, 34), x, y);
        x += widths[columnIndex];
      });
      y += 8;
    });

    doc.save(`utang_toko_${monthFilter}_${yearFilter}_${statusFilter}.pdf`);
  };

  return (
    <FinancialReportShell
      eyebrow="Simpan Pinjam"
      title="Utang Toko"
      description="Input manual utang toko anggota per bulan dan tersimpan ke database."
    >
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Input Manual
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Tambah Utang Toko
          </h2>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Nama Anggota
              </span>
              <input
                value={memberQuery}
                onChange={(event) => {
                  setMemberQuery(event.target.value);
                  setFormData({ ...formData, id_anggota: "" });
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500"
                placeholder="Cari nama / no anggota..."
                required
              />
              {memberQuery && !formData.id_anggota ? (
                <div className="mt-2 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  {filteredMemberOptions.slice(0, 8).map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => chooseMember(member)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-900">
                        {member.nama}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {member.no_anggota}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Bulan
              </span>
              <input
                type="month"
                value={formData.bulan}
                onChange={(event) =>
                  setFormData({ ...formData, bulan: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Jumlah Utang
              </span>
              <input
                type="number"
                min={1}
                value={formData.jumlah}
                onChange={(event) =>
                  setFormData({ ...formData, jumlah: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-emerald-500"
                placeholder="Contoh: 500000"
                required
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-400"
            >
              {saving ? "Menyimpan..." : "Simpan Utang"}
            </button>
          </div>
        </form>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Daftar Utang Toko
              </h2>
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
            <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                Total Utang
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(totalDebt)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                Jumlah Data
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {filteredRows.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                Anggota Tercatat
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {totalMembers}
              </p>
            </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
                placeholder="Cari nama atau no anggota..."
              />
              <select
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
              >
                <option value="semua">Semua bulan</option>
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
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
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-900"
              >
                <option value="semua">Semua status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-4">Nama Anggota</th>
                  <th className="px-5 py-4">Bulan</th>
                  <th className="px-5 py-4 text-right">Jumlah Utang</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Memuat data utang toko...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Belum ada data utang toko.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {item.nama}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.no_anggota}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatMonth(item.bulan)}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-900">
                        {formatMoney(item.jumlah)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-slate-700">
                          {item.status_pekerjaan || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(item.id)}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-bold text-slate-900">
                  <td className="px-5 py-4" colSpan={2}>
                    Total
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatMoney(totalDebt)}
                  </td>
                  <td className="px-5 py-4" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </FinancialReportShell>
  );
}
