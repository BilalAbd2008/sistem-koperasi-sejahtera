// Utilitas untuk export laporan ke berbagai format

export const exportToExcel = (data: any[], sheetName: string = "Laporan", fileName: string = "laporan.xlsx") => {
  // Minimal implementation: generate CSV-like format dalam blob
  const XLSX = require("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

export const exportToCSV = (data: any[], fileName: string = "laporan.csv") => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (typeof value === "string" && value.includes(",")) {
            return `"${value}"`;
          }
          return value ?? "";
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", fileName);
  link.click();
};

export const exportToPDF = async (
  content: string,
  title: string = "Laporan",
  fileName: string = "laporan.pdf",
) => {
  const jsPDF = require("jspdf").jsPDF;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(title, 10, 10);

  doc.setFontSize(12);
  const lines = doc.splitTextToSize(content, 190);
  doc.text(lines, 10, 20);

  doc.save(fileName);
};

export const exportTableToExcel = (tableId: string, fileName: string) => {
  const table = document.getElementById(tableId);
  if (!table) return;

  const XLSX = require("xlsx");
  const workbook = XLSX.utils.table_to_book(table);
  XLSX.writeFile(workbook, fileName);
};
