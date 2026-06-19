"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BendaharaSidebar from "@/components/BendaharaSidebar";
import { getCurrentUser } from "@/lib/auth";
import { exportToExcel } from "@/lib/export";

interface UserData {
  nama_lengkap: string;
  username: string;
  role: string;
}

interface SimpananItem {
  id: number;
  id_anggota: number;
  no_anggota: string;
  nama: string;
  status_pekerjaan: string | null;
  jenis_simpanan: string;
  jumlah: number;
  tanggal_simpanan: string;
  status: string;
}

interface NasabahItem {
  id: number;
  nama: string;
  no_anggota: string;
}

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function BendaharaSimpananPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [simpanan, setSimpanan] = useState<SimpananItem[]>([]);
  const [nasabah, setNasabah] = useState<NasabahItem[]>([]);
  const [search, setSearch] = useState("");
  const [jenisFilter, setJenisFilter] = useState("semua");
  const [nasabahFilter, setNasabahFilter] = useState("semua");
  const [range, setRange] = useState("bulan-ini");
  const [loading, setLoading] = useState(true);
  const [showTambahModal, setShowTambahModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SimpananItem | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [formData, setFormData] = useState({
    id_anggota: "",
    jenis_simpanan: "wajib",
    jumlah: "",
    tanggal_simpanan: toDateInput(new Date()),
    status: "aktif",
  });

  const loadData = async () => {
    try {
      const [response, nasabahResponse] = await Promise.all([
        fetch("/api/simpanan"),
        fetch("/api/anggota"),
      ]);
      const data = await response.json();
      const nasabahData = await nasabahResponse.json();
      if (data.success) setSimpanan(data.data);
      if (nasabahData.success) setNasabah(nasabahData.data);
    } catch (error) {
      console.error("Error fetching simpanan:", error);
    } finally {
      setLoading(false);
    }
  };

  const labelJenis = (jenis: string) => {
    if (jenis === "lebaran") return "Lebaran";
    if (jenis === "pendidikan") return "Pendidikan";
    if (jenis === "sukarela") return "Sukarela";
    return "Wajib";
  };

  const getDateRange = () => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    if (range === "semua") return null;
    if (range === "bulan-ini") {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (range === "tahun-ini") {
      return new Date(now.getFullYear(), 0, 1);
    }

    const date = new Date(startOfToday);
    date.setDate(date.getDate() - Number(range || 31));
    return date;
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return void router.push("/");
    if (user.role !== "bendahara") return void router.push("/");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(user);
    loadData();
  }, [router]);

  const handleEdit = async (item: SimpananItem) => {
    setEditingItem(item);
    setMemberQuery(`${item.nama} - ${item.no_anggota}`);
    setFormData({
      id_anggota: String(item.id_anggota),
      jenis_simpanan: item.jenis_simpanan,
      jumlah: String(item.jumlah),
      tanggal_simpanan: item.tanggal_simpanan?.slice(0, 10) || toDateInput(new Date()),
      status: item.status,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const response = await fetch("/api/simpanan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          id_anggota: Number(formData.id_anggota),
          jenis_simpanan: formData.jenis_simpanan,
          jumlah: Number(formData.jumlah),
          tanggal_simpanan: formData.tanggal_simpanan,
          status: formData.status,
        }),
      });
      if (response.ok) {
        loadData();
        setShowEditModal(false);
        setEditingItem(null);
        setMemberQuery("");
        setFormData({ id_anggota: "", jenis_simpanan: "wajib", jumlah: "", tanggal_simpanan: toDateInput(new Date()), status: "aktif" });
      }
    } catch (error) {
      console.error("Error updating simpanan:", error);
    }
  };

  const handleDelete = async (item: SimpananItem) => {
    if (!window.confirm(`Hapus simpanan milik ${item.nama}?`)) return;

    try {
      const response = await fetch("/api/simpanan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (response.ok) loadData();
    } catch (error) {
      console.error("Error deleting simpanan:", error);
    }
  };

  const handleTambahSimpanan = async () => {
    setMemberQuery("");
    setFormData({ id_anggota: "", jenis_simpanan: "wajib", jumlah: "", tanggal_simpanan: toDateInput(new Date()), status: "aktif" });
    setEditingItem(null);
    setShowTambahModal(true);
  };

  const handleTambahSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_anggota || !formData.jenis_simpanan || !formData.jumlah) {
      return;
    }

    try {
      const response = await fetch("/api/simpanan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_anggota: Number(formData.id_anggota),
          jenis_simpanan: formData.jenis_simpanan,
          jumlah: Number(formData.jumlah),
          tanggal_simpanan: formData.tanggal_simpanan,
          status: formData.status,
        }),
      });

      if (response.ok) {
        loadData();
        setShowTambahModal(false);
        setMemberQuery("");
        setFormData({ id_anggota: "", jenis_simpanan: "wajib", jumlah: "", tanggal_simpanan: toDateInput(new Date()), status: "aktif" });
      }
    } catch (error) {
      console.error("Error creating simpanan:", error);
    }
  };

  if (!user)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Memuat data simpanan...
      </div>
    );
  const startDate = getDateRange();
  const filtered = simpanan.filter((item) => {
    const byJenis =
      jenisFilter === "semua" || item.jenis_simpanan === jenisFilter;
    const byNasabah =
      nasabahFilter === "semua" || String(item.id_anggota) === nasabahFilter;
    const byDate =
      !startDate || new Date(item.tanggal_simpanan).getTime() >= startDate.getTime();
    const bySearch = item.nama
      .toLowerCase()
      .includes(search.toLowerCase());

    return byJenis && byNasabah && byDate && bySearch;
  });
  const totalNominal = filtered.reduce(
    (sum, item) => sum + Number(item.jumlah || 0),
    0,
  );
  const exportRows = filtered.map((item) => ({
    no_anggota: item.no_anggota || "-",
    nasabah: item.nama,
    jenis_simpanan: labelJenis(item.jenis_simpanan),
    nominal: Number(item.jumlah || 0),
    tanggal: new Date(item.tanggal_simpanan).toLocaleDateString("id-ID"),
    status: item.status_pekerjaan || "-",
  }));
  const exportTitle = `Simpanan ${jenisFilter === "semua" ? "Semua Jenis" : labelJenis(jenisFilter)}`;
  const exportFileName = `simpanan_${jenisFilter}_${nasabahFilter}_${range}`;
  const filteredMemberOptions = nasabah.filter((item) => {
    const query = memberQuery.toLowerCase();
    return (
      item.nama.toLowerCase().includes(query) ||
      item.no_anggota.toLowerCase().includes(query)
    );
  });

  const chooseMember = (item: NasabahItem) => {
    setFormData({ ...formData, id_anggota: String(item.id) });
    setMemberQuery(`${item.nama} - ${item.no_anggota}`);
  };

  const handleExportExcel = () => {
    exportToExcel(exportRows, "Simpanan", `${exportFileName}.xlsx`);
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const rowHeight = 9;
    const tableTop = 78;
    const filterNasabah =
      nasabahFilter === "semua"
        ? "Semua"
        : nasabah.find((item) => String(item.id) === nasabahFilter)?.nama || "-";
    const periodeLabel =
      range === "bulan-ini"
        ? "Bulan ini"
        : range === "tahun-ini"
          ? "Tahun ini"
          : range === "semua"
            ? "Semua data"
            : `${range} hari terakhir`;
    const columns = [
      { label: "No", x: 14, width: 12 },
      { label: "Tanggal", x: 27, width: 25 },
      { label: "No. Anggota", x: 54, width: 32 },
      { label: "Nasabah", x: 89, width: 58 },
      { label: "Jenis", x: 150, width: 30 },
      { label: "Nominal", x: 184, width: 38 },
      { label: "Status", x: 228, width: 26 },
    ];

    const drawHeader = (page: number) => {
      doc.setFillColor(5, 150, 105);
      doc.rect(0, 0, pageWidth, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Koperasi PRI BDAPK Cinagara", margin, 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Laporan Simpanan Nasabah", margin, 17);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(exportTitle, margin, 36);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, pageWidth - margin, 36, {
        align: "right",
      });

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, 43, pageWidth - margin * 2, 24, 2, 2, "FD");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Jenis", margin + 6, 52);
      doc.text("Nasabah", margin + 55, 52);
      doc.text("Periode", margin + 132, 52);
      doc.text("Total", margin + 190, 52);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(jenisFilter === "semua" ? "Semua Jenis" : labelJenis(jenisFilter), margin + 6, 61);
      doc.text(filterNasabah, margin + 55, 61);
      doc.text(periodeLabel, margin + 132, 61);
      doc.text(`Rp ${totalNominal.toLocaleString("id-ID")}`, margin + 190, 61);

      doc.setFillColor(241, 245, 249);
      doc.rect(margin, tableTop - rowHeight, pageWidth - margin * 2, rowHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      columns.forEach((column) => doc.text(column.label, column.x, tableTop - 3));

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Halaman ${page}`, pageWidth - margin, pageHeight - 7, { align: "right" });
    };

    let page = 1;
    let y = tableTop;
    drawHeader(page);

    if (exportRows.length === 0) {
      doc.setTextColor(100, 116, 139);
      doc.text("Tidak ada data sesuai filter.", margin, y + 6);
    }

    exportRows.forEach((item, index) => {
      if (y + rowHeight > pageHeight - 16) {
        doc.addPage();
        page += 1;
        y = tableTop;
        drawHeader(page);
      }

      if (index % 2 === 0) {
        doc.setFillColor(252, 252, 253);
        doc.rect(margin, y - 6, pageWidth - margin * 2, rowHeight, "F");
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 3, pageWidth - margin, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(String(index + 1), columns[0].x, y);
      doc.text(item.tanggal, columns[1].x, y);
      doc.text(item.no_anggota, columns[2].x, y);
      doc.text(doc.splitTextToSize(item.nasabah, columns[3].width)[0] || "-", columns[3].x, y);
      doc.text(item.jenis_simpanan, columns[4].x, y);
      doc.text(`Rp ${item.nominal.toLocaleString("id-ID")}`, columns[5].x + columns[5].width, y, {
        align: "right",
      });
      doc.text(item.status, columns[6].x, y);
      y += rowHeight;
    });

    doc.setFillColor(236, 253, 245);
    doc.rect(margin, y, pageWidth - margin * 2, rowHeight + 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(6, 95, 70);
    doc.text("Total", columns[0].x, y + 7);
    doc.text(`Rp ${totalNominal.toLocaleString("id-ID")}`, columns[5].x + columns[5].width, y + 7, {
      align: "right",
    });

    doc.save(`${exportFileName}.pdf`);
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-slate-100">
      <div className="flex h-full">
        <BendaharaSidebar user={user} />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-8 py-6">
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Simpanan Bendahara
                </p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Data Simpanan Nasabah
                </h1>
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
                  onClick={handleTambahSimpanan}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  + Tambah Simpanan
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <select
                value={jenisFilter}
                onChange={(e) => setJenisFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              >
                <option value="semua">Semua Jenis</option>
                <option value="wajib">Simpanan Wajib</option>
                <option value="lebaran">Simpanan Lebaran</option>
                <option value="pendidikan">Simpanan Pendidikan</option>
                <option value="sukarela">Simpanan Sukarela</option>
              </select>
              <select
                value={nasabahFilter}
                onChange={(e) => setNasabahFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              >
                <option value="semua">Semua Nasabah</option>
                {nasabah.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama}
                  </option>
                ))}
              </select>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
              >
                <option value="bulan-ini">Bulan ini</option>
                <option value="31">31 hari terakhir</option>
                <option value="90">3 bulan terakhir</option>
                <option value="tahun-ini">Tahun ini</option>
                <option value="semua">Semua data</option>
              </select>
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
                placeholder="Cari nama nasabah..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Nasabah</th>
                    <th className="px-6 py-4">Jenis</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading ? [] : filtered.slice(0, 12)).map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 text-slate-900">{item.nama}</td>
                      <td className="px-6 py-4 text-slate-700 capitalize">
                        {labelJenis(item.jenis_simpanan)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        Rp {Number(item.jumlah).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {new Date(item.tanggal_simpanan).toLocaleDateString(
                          "id-ID",
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-700">
                          {item.status_pekerjaan || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-200"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                    <td className="px-6 py-4 text-slate-900" colSpan={2}>
                      Total
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      Rp {totalNominal.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4" colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </main>
      </div>

      {showTambahModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Tambah Simpanan</h2>
            <form onSubmit={handleTambahSubmit} className="space-y-4">
              <div>
                <input
                  value={memberQuery}
                  onChange={(event) => {
                    setMemberQuery(event.target.value);
                    setFormData({ ...formData, id_anggota: "" });
                  }}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2"
                  placeholder="Cari nama / no anggota..."
                  required
                />
                {memberQuery && !formData.id_anggota ? (
                  <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    {filteredMemberOptions.slice(0, 8).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => chooseMember(item)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-semibold text-slate-900">
                          {item.nama}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {item.no_anggota}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <select
                value={formData.jenis_simpanan}
                onChange={(e) => setFormData({ ...formData, jenis_simpanan: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
              >
                <option value="wajib">Wajib</option>
                <option value="lebaran">Lebaran</option>
                <option value="pendidikan">Pendidikan</option>
                <option value="sukarela">Sukarela</option>
              </select>
              <input
                type="number"
                value={formData.jumlah}
                onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                placeholder="Jumlah"
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <input
                type="date"
                value={formData.tanggal_simpanan}
                onChange={(e) => setFormData({ ...formData, tanggal_simpanan: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowTambahModal(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2">
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
            <h2 className="mb-4 text-xl font-bold text-slate-900">Edit Simpanan</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <input
                  value={memberQuery}
                  onChange={(event) => {
                    setMemberQuery(event.target.value);
                    setFormData({ ...formData, id_anggota: "" });
                  }}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2"
                  placeholder="Cari nama / no anggota..."
                  required
                />
                {memberQuery && !formData.id_anggota ? (
                  <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    {filteredMemberOptions.slice(0, 8).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => chooseMember(item)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-semibold text-slate-900">
                          {item.nama}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {item.no_anggota}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <select
                value={formData.jenis_simpanan}
                onChange={(e) => setFormData({ ...formData, jenis_simpanan: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
              >
                <option value="wajib">Wajib</option>
                <option value="lebaran">Lebaran</option>
                <option value="pendidikan">Pendidikan</option>
                <option value="sukarela">Sukarela</option>
              </select>
              <input
                type="number"
                value={formData.jumlah}
                onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <input
                type="date"
                value={formData.tanggal_simpanan}
                onChange={(e) => setFormData({ ...formData, tanggal_simpanan: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2">
                  Batal
                </button>
                <button type="submit" className="flex-1 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">
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
