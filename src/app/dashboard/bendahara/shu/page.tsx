"use client";

import { useEffect, useMemo, useState } from "react";
import { FinancialReportShell } from "@/components/accounting";
import { exportToExcel } from "@/lib/export";

interface AllocationItem {
  key: string;
  label: string;
  percent: number;
}

interface ShuMember {
  idAnggota: number;
  noAnggota: string;
  nama: string;
  simpanan: number;
  pinjaman: number;
  utangToko: number;
  partisipasi: number;
  jasaModal: number;
  jasaUsaha: number;
  totalShu: number;
}

interface ShuResponseData {
  periode: string;
  totalRevenues: number;
  totalExpenses: number;
  totalShu: number;
  totalSimpanan: number;
  totalPartisipasi: number;
  allocations: AllocationItem[];
  pools: {
    jasaModal: number;
    jasaUsaha: number;
  };
  members: ShuMember[];
}

const formatMoney = (value: number) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const currentPeriod = () =>
  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

export default function BendaharaShuPage() {
  const [periode, setPeriode] = useState(currentPeriod());
  const [data, setData] = useState<ShuResponseData | null>(null);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberOptions, setShowMemberOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingAllocation, setSavingAllocation] = useState(false);

  const selectedMember = useMemo(() => {
    if (!data?.members.length) return null;
    return (
      data.members.find((member) => member.nama === selectedName) ||
      data.members[0]
    );
  }, [data, selectedName]);

  const allocationTotalPercent = allocations.reduce(
    (sum, item) => sum + Number(item.percent || 0),
    0,
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shu?periode=${periode}`);
      const result = await response.json();
      if (result.success) {
        const nextData = result.data as ShuResponseData;
        setData(nextData);
        setAllocations(nextData.allocations);
        setSelectedName((current) => {
          if (nextData.members.some((member) => member.nama === current)) {
            setMemberSearch(current);
            return current;
          }
          const firstName = nextData.members[0]?.nama || "";
          setMemberSearch(firstName);
          return firstName;
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateAllocation = (key: string, percent: number) => {
    setAllocations((current) =>
      current.map((item) =>
        item.key === key ? { ...item, percent: Math.max(0, percent) } : item,
      ),
    );
  };

  const saveAllocations = async () => {
    setSavingAllocation(true);
    try {
      const response = await fetch("/api/shu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periode, allocations }),
      });

      if (response.ok) {
        await loadData();
      }
    } finally {
      setSavingAllocation(false);
    }
  };

  const previewPools = useMemo(() => {
    const totalShu = data?.totalShu || 0;
    const jasaModal =
      (totalShu *
        (allocations.find((item) => item.key === "jasaModal")?.percent || 0)) /
      100;
    const jasaUsaha =
      (totalShu *
        (allocations.find((item) => item.key === "jasaUsaha")?.percent || 0)) /
      100;

    return { jasaModal, jasaUsaha };
  }, [allocations, data?.totalShu]);

  const previewSelected = useMemo(() => {
    if (!data || !selectedMember) {
      return { jasaModal: 0, jasaUsaha: 0, totalShu: 0 };
    }

    const jasaModal =
      data.totalSimpanan > 0
        ? (selectedMember.simpanan / data.totalSimpanan) *
          previewPools.jasaModal
        : 0;
    const jasaUsaha =
      data.totalPartisipasi > 0
        ? (selectedMember.partisipasi / data.totalPartisipasi) *
          previewPools.jasaUsaha
        : 0;

    return {
      jasaModal,
      jasaUsaha,
      totalShu: jasaModal + jasaUsaha,
    };
  }, [data, previewPools.jasaModal, previewPools.jasaUsaha, selectedMember]);

  const filteredMemberOptions = useMemo(() => {
    const query = memberSearch.toLowerCase();
    return (data?.members || []).filter(
      (member) =>
        member.nama.toLowerCase().includes(query) ||
        member.noAnggota.toLowerCase().includes(query),
    );
  }, [data?.members, memberSearch]);

  const buildExportRows = () => {
    if (!data) return [];

    return data.members.map((row) => {
      const jasaModal =
        data.totalSimpanan > 0
          ? (row.simpanan / data.totalSimpanan) * previewPools.jasaModal
          : 0;
      const jasaUsaha =
        data.totalPartisipasi > 0
          ? (row.partisipasi / data.totalPartisipasi) * previewPools.jasaUsaha
          : 0;

      return {
        "No Anggota": row.noAnggota,
        Nama: row.nama,
        Simpanan: row.simpanan,
        Pinjaman: row.pinjaman,
        "Utang Toko": row.utangToko,
        Partisipasi: row.partisipasi,
        "Jasa Modal": Math.round(jasaModal),
        "Jasa Usaha": Math.round(jasaUsaha),
        "Total SHU": Math.round(jasaModal + jasaUsaha),
      };
    });
  };

  const handleExportExcel = () => {
    exportToExcel(buildExportRows(), "SHU", `shu_${periode}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (!data) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const rows = buildExportRows();

    doc.setFillColor(5, 150, 105);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Laporan Pembagian SHU", margin, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Periode ${periode}`, margin, 17);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Total SHU: ${formatMoney(data.totalShu)}`, margin, 34);
    doc.text(`Dana Jasa Modal: ${formatMoney(previewPools.jasaModal)}`, margin + 62, 34);
    doc.text(`Dana Jasa Usaha: ${formatMoney(previewPools.jasaUsaha)}`, margin + 140, 34);

    const headers = ["No", "No Anggota", "Nama", "Simpanan", "Pinjaman", "Utang Toko", "Jasa Modal", "Jasa Usaha", "Total SHU"];
    const widths = [10, 24, 42, 30, 30, 30, 30, 30, 32];
    let y = 48;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 7, pageWidth - margin * 2, 10, "F");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    let x = margin + 2;
    headers.forEach((header, index) => {
      doc.text(header, x, y);
      x += widths[index];
    });

    y += 9;
    rows.forEach((row, index) => {
      if (y > 190) {
        doc.addPage();
        y = 18;
      }

      x = margin + 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      [
        String(index + 1),
        String(row["No Anggota"]),
        String(row.Nama),
        formatMoney(Number(row.Simpanan)),
        formatMoney(Number(row.Pinjaman)),
        formatMoney(Number(row["Utang Toko"])),
        formatMoney(Number(row["Jasa Modal"])),
        formatMoney(Number(row["Jasa Usaha"])),
        formatMoney(Number(row["Total SHU"])),
      ].forEach((value, columnIndex) => {
        doc.text(value.slice(0, 24), x, y);
        x += widths[columnIndex];
      });
      y += 8;
    });

    doc.save(`shu_${periode}.pdf`);
  };

  return (
    <FinancialReportShell
      eyebrow="Laporan Keuangan"
      title="SHU"
      description="Pembagian SHU terhubung dengan simpanan, pinjaman, dan utang toko yang tersimpan di database."
    >
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-700">
          <span className="mb-1 block">Periode</span>
          <input
            value={periode}
            onChange={(event) => setPeriode(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
            placeholder="2026-05"
          />
        </label>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
        >
          {loading ? "Memuat..." : "Tampilkan"}
        </button>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={!data}
          className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:text-slate-400"
        >
          Export Excel
        </button>
        <button
          type="button"
          onClick={handleExportPDF}
          disabled={!data}
          className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:text-slate-400"
        >
          Export PDF
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Ringkasan
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              SHU Tahun Berjalan
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Total SHU
                </p>
                <p className="mt-2 text-xl font-bold text-emerald-700">
                  {formatMoney(data?.totalShu || 0)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Anggota Aktif
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {data?.members.length || 0} orang
                </p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-xs font-semibold text-sky-700">
                  Dana Jasa Modal
                </p>
                <p className="mt-2 text-lg font-bold text-sky-700">
                  {formatMoney(previewPools.jasaModal)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold text-emerald-700">
                  Dana Jasa Usaha
                </p>
                <p className="mt-2 text-lg font-bold text-emerald-700">
                  {formatMoney(previewPools.jasaUsaha)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Alokasi
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  Pembagian SHU
                </h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  allocationTotalPercent === 100
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {allocationTotalPercent}%
              </span>
            </div>
            <div className="space-y-3">
              {allocations.map((item) => {
                const amount =
                  ((data?.totalShu || 0) * Number(item.percent || 0)) / 100;
                return (
                  <label
                    key={item.key}
                    className="grid grid-cols-[1fr_86px_112px] items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-slate-700">
                      {item.label}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={item.percent}
                      onChange={(event) =>
                        updateAllocation(item.key, Number(event.target.value))
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1 text-right text-sm font-semibold"
                      aria-label={`Persentase ${item.label}`}
                    />
                    <span className="text-right text-sm font-bold text-slate-900">
                      {formatMoney(amount)}
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              onClick={saveAllocations}
              disabled={savingAllocation}
              className="mt-4 w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:bg-slate-400"
            >
              {savingAllocation ? "Menyimpan..." : "Simpan Alokasi"}
            </button>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Lembar Kerja
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Saldo Simpanan dan Pinjaman Anggota
              </h2>
            </div>
          </div>

          <div className="overflow-auto">
            <div className="min-w-[980px] bg-white p-4">
              <table className="w-full table-fixed border-collapse text-sm [&_thead]:hidden [&_tr>*:first-child]:hidden">
                <colgroup>
                  <col className="hidden" />
                  <col className="w-[150px]" />
                  <col className="w-[150px]" />
                  <col className="w-[64px]" />
                  <col className="w-[230px]" />
                  <col className="w-[230px]" />
                  <col className="w-[64px]" />
                  <col className="w-[150px]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-100 text-center text-xs font-bold text-slate-500">
                    {["", "A", "B", "C", "D", "E", "F", "G"].map((item) => (
                      <th key={item} className="border border-slate-200 px-2 py-1">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs font-bold text-slate-500">1</td>
                    <td colSpan={7} className="border border-slate-300 bg-slate-200 px-2 py-2 text-center text-lg font-bold text-blue-950">
                      Saldo Simpanan dan Pinjaman Anggota
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs font-bold text-slate-500">2</td>
                    <td className="border border-slate-200 px-2 py-2 font-semibold">No. Anggota</td>
                    <td className="border border-slate-200 px-2 py-2">:</td>
                    <td colSpan={5} className="whitespace-nowrap border border-slate-200 bg-white px-3 py-2 text-base font-bold text-slate-950">
                      {selectedMember?.noAnggota || "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs font-bold text-slate-500">3</td>
                    <td className="border border-slate-200 px-2 py-2 font-semibold">Nama Anggota</td>
                    <td className="border border-slate-200 px-2 py-2">:</td>
                    <td colSpan={5} className="border border-slate-200 px-2 py-2 font-semibold">
                      <div className="relative max-w-md">
                        <input
                          value={memberSearch}
                          onFocus={() => setShowMemberOptions(true)}
                          onBlur={() => {
                            window.setTimeout(() => setShowMemberOptions(false), 120);
                          }}
                          onChange={(event) => {
                            setMemberSearch(event.target.value);
                            setShowMemberOptions(true);
                          }}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500"
                          placeholder="Cari nama anggota..."
                        />
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            setShowMemberOptions((current) => !current);
                          }}
                          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                          aria-label="Buka pilihan nama anggota"
                        >
                          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                            <path d="M5.3 7.3 10 12l4.7-4.7 1.1 1.1L10 14.2 4.2 8.4l1.1-1.1Z" />
                          </svg>
                        </button>
                        {showMemberOptions && (
                          <div className="absolute left-0 top-11 z-20 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                            {filteredMemberOptions.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-slate-500">
                                Nama tidak ditemukan.
                              </div>
                            ) : (
                              filteredMemberOptions.map((member) => (
                                <button
                                  key={member.idAnggota}
                                  type="button"
                                  onMouseDown={() => {
                                    setSelectedName(member.nama);
                                    setMemberSearch(member.nama);
                                    setShowMemberOptions(false);
                                  }}
                                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50"
                                >
                                  <span className="font-semibold text-slate-900">
                                    {member.nama}
                                  </span>
                                  <span className="whitespace-nowrap text-xs font-bold text-slate-500">
                                    {member.noAnggota}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-100 px-2 py-3 text-center text-xs font-bold text-slate-500">4</td>
                    <td colSpan={7} className="border border-slate-200" />
                  </tr>
                  <tr className="bg-blue-50 font-bold text-blue-950">
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs text-slate-500">5</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">No.</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Jenis Simpanan</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2 text-center">Jumlah Simpanan</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Keterangan</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2" />
                  </tr>
                  {[
                    ["1", "Simpanan Wajib", 0, ""],
                    ["2", "Simpanan Lebaran", 0, ""],
                    ["3", "Simpanan Pendidikan", 0, ""],
                    ["4", "Simpanan Sukarela", selectedMember?.simpanan || 0, "Dari tabel simpanan"],
                  ].map((row, index) => (
                    <tr key={`simpanan-${row[0]}`}>
                      <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs font-bold text-slate-500">{6 + index}</td>
                      <td className="border border-slate-300 px-2 py-2 text-center">{row[0]}</td>
                      <td className="border border-slate-300 px-2 py-2">{row[1]}</td>
                      <td className="border border-slate-300 px-2 py-2 text-center">Rp</td>
                      <td className="border border-slate-300 px-2 py-2 text-right">{Number(row[2]).toLocaleString("id-ID")}</td>
                      <td className="border border-slate-300 px-2 py-2">{row[3]}</td>
                      <td colSpan={2} className="border border-slate-200 px-2 py-2" />
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs text-slate-500">10</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2">Total Simpanan</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Rp</td>
                    <td className="border border-slate-300 px-2 py-2 text-right">{Number(selectedMember?.simpanan || 0).toLocaleString("id-ID")}</td>
                    <td colSpan={3} className="border border-slate-200" />
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-100 px-2 py-3 text-center text-xs font-bold text-slate-500">11</td>
                    <td colSpan={7} className="border border-slate-200" />
                  </tr>
                  <tr className="bg-blue-50 font-bold text-blue-950">
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs text-slate-500">12</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">No.</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Jenis Pinjaman</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2 text-center">Jumlah Pinjaman</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Keterangan</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2" />
                  </tr>
                  {[
                    ["1", "Piutang Simpan Pinjam", selectedMember?.pinjaman || 0, "Dari tabel pinjaman"],
                    ["2", "Piutang Barang", selectedMember?.utangToko || 0, "Dari utang toko"],
                  ].map((row, index) => (
                    <tr key={`pinjaman-${row[0]}`}>
                      <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs font-bold text-slate-500">{13 + index}</td>
                      <td className="border border-slate-300 px-2 py-2 text-center">{row[0]}</td>
                      <td className="border border-slate-300 px-2 py-2">{row[1]}</td>
                      <td className="border border-slate-300 px-2 py-2 text-center">Rp</td>
                      <td className="border border-slate-300 px-2 py-2 text-right">{Number(row[2]).toLocaleString("id-ID")}</td>
                      <td className="border border-slate-300 px-2 py-2">{row[3]}</td>
                      <td colSpan={2} className="border border-slate-200" />
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs text-slate-500">15</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2">Total Pinjaman</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Rp</td>
                    <td className="border border-slate-300 px-2 py-2 text-right">{Number(selectedMember?.partisipasi || 0).toLocaleString("id-ID")}</td>
                    <td colSpan={3} className="border border-slate-200" />
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-100 px-2 py-3 text-center text-xs font-bold text-slate-500">16</td>
                    <td colSpan={7} className="border border-slate-200" />
                  </tr>
                  <tr className="bg-blue-50 font-bold text-blue-950">
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs text-slate-500">17</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">No.</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Jenis Partisipasi</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2 text-center">Jumlah Partisipasi</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Keterangan</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2" />
                  </tr>
                  {[
                    ["1", "Partisipasi Jasa Simpan Pinjam", selectedMember?.simpanan || 0, ""],
                    ["2", "Partisipasi Jasa Pinjaman Barang", selectedMember?.utangToko || 0, ""],
                  ].map((row, index) => (
                    <tr key={`partisipasi-${row[0]}`}>
                      <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs font-bold text-slate-500">{18 + index}</td>
                      <td className="border border-slate-300 px-2 py-2 text-center">{row[0]}</td>
                      <td className="border border-slate-300 px-2 py-2">{row[1]}</td>
                      <td className="border border-slate-300 px-2 py-2 text-center">Rp</td>
                      <td className="border border-slate-300 px-2 py-2 text-right">{Number(row[2]).toLocaleString("id-ID")}</td>
                      <td className="border border-slate-300 px-2 py-2">{row[3]}</td>
                      <td colSpan={2} className="border border-slate-200" />
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs text-slate-500">20</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2">Total Partisipasi</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Rp</td>
                    <td className="border border-slate-300 px-2 py-2 text-right">{Number(selectedMember?.partisipasi || 0).toLocaleString("id-ID")}</td>
                    <td colSpan={3} className="border border-slate-200" />
                  </tr>
                  <tr>
                    <td className="border border-slate-200 bg-slate-100 px-2 py-3 text-center text-xs font-bold text-slate-500">21</td>
                    <td colSpan={7} className="border border-slate-200" />
                  </tr>
                  <tr className="bg-blue-50 font-bold text-blue-950">
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs text-slate-500">22</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">No.</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Sisa Hasil Usaha Koperasi</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2 text-center">Jumlah Sisa Hasil Usaha</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Dasar Perhitungan</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2 text-center">Nilai</td>
                  </tr>
                  {[
                    ["1", "Sisa Hasil Usaha Atas Jasa Modal", previewSelected.jasaModal, "Dana Jasa Modal", previewPools.jasaModal],
                    ["2", "Sisa Hasil Usaha Atas Jasa Transaksi", previewSelected.jasaUsaha, "Dana Jasa Usaha", previewPools.jasaUsaha],
                  ].map((row, index) => (
                    <tr key={`shu-${row[0]}`}>
                      <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs font-bold text-slate-500">{23 + index}</td>
                      <td className="border border-slate-300 px-2 py-2 text-center">{row[0]}</td>
                      <td className="border border-slate-300 px-2 py-2">{row[1]}</td>
                      <td className="border border-slate-300 px-2 py-2 text-center">Rp</td>
                      <td className="border border-slate-300 px-2 py-2 text-right">{Number(row[2]).toLocaleString("id-ID")}</td>
                      <td className="border border-slate-300 px-2 py-2">{row[3]}</td>
                      <td className="border border-slate-300 px-2 py-2 text-center">Rp</td>
                      <td className="border border-slate-300 px-2 py-2 text-right">{Number(row[4]).toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-xs text-slate-500">25</td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-2">Total Sisa Hasil Usaha</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Rp</td>
                    <td className="border border-slate-300 px-2 py-2 text-right">{Number(previewSelected.totalShu).toLocaleString("id-ID")}</td>
                    <td className="border border-slate-300 px-2 py-2">Total SHU</td>
                    <td className="border border-slate-300 px-2 py-2 text-center">Rp</td>
                    <td className="border border-slate-300 px-2 py-2 text-right">{Number(data?.totalShu || 0).toLocaleString("id-ID")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-200 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Pembagian SHU Per Anggota
            </h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">No Anggota</th>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3 text-right">Simpanan</th>
                    <th className="px-4 py-3 text-right">Pinjaman</th>
                    <th className="px-4 py-3 text-right">Utang Toko</th>
                    <th className="px-4 py-3 text-right">Jasa Modal</th>
                    <th className="px-4 py-3 text-right">Jasa Usaha</th>
                    <th className="px-4 py-3 text-right">Total SHU</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Memuat data SHU...
                      </td>
                    </tr>
                  ) : (data?.members || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Belum ada anggota aktif untuk dihitung.
                      </td>
                    </tr>
                  ) : data ? (
                    data.members.map((row) => {
                      const recalculatedJasaModal =
                        data.totalSimpanan > 0
                          ? (row.simpanan / data.totalSimpanan) *
                            previewPools.jasaModal
                          : 0;
                      const recalculatedJasaUsaha =
                        data.totalPartisipasi > 0
                          ? (row.partisipasi / data.totalPartisipasi) *
                            previewPools.jasaUsaha
                          : 0;
                      const recalculatedTotal =
                        recalculatedJasaModal + recalculatedJasaUsaha;

                      return (
                        <tr
                          key={row.idAnggota}
                          className="border-t border-slate-100"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {row.noAnggota}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {row.nama}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatMoney(row.simpanan)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatMoney(row.pinjaman)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatMoney(row.utangToko)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatMoney(recalculatedJasaModal)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatMoney(recalculatedJasaUsaha)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {formatMoney(recalculatedTotal)}
                          </td>
                        </tr>
                      );
                    })
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </FinancialReportShell>
  );
}
