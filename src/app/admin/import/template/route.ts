import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { styleHeader, xlsxResponse } from "@/lib/excel";
import { MAX_IMPORT_ROWS, TEMPLATE_COLUMNS } from "@/lib/import";

export const dynamic = "force-dynamic";

/** Empty Excel file to fill in and upload with "Import dari Excel" on /admin. */
export async function GET() {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tamu", { views: [{ state: "frozen", ySplit: 1 }] });
  // Text format, so Excel keeps the leading 0 of phone numbers and doesn't turn them into numbers.
  sheet.columns = TEMPLATE_COLUMNS.map((c) => ({ ...c, style: { numFmt: "@" } }));
  styleHeader(sheet);

  const help = workbook.addWorksheet("Petunjuk");
  help.columns = [{ width: 16 }, { width: 90 }];
  help.addRows([
    ["Cara mengisi", ""],
    ["", 'Isi data tamu di sheet "Tamu", satu baris per tamu, mulai baris 2. Jangan ubah judul kolom di baris 1.'],
    ["Nama", "Wajib. Nama lengkap tamu, maksimal 120 karakter."],
    ["Perusahaan", "Wajib. Nama perusahaan atau instansi, maksimal 120 karakter."],
    ["Email", "Opsional, tapi diperlukan untuk mengirim undangan dan QR code lewat email. Satu email hanya untuk satu tamu."],
    ["Telepon", "Opsional. Contoh: 0812-3456-7890 atau +62 812 3456 7890."],
    ["", ""],
    ["Catatan", "Pendamping (+1) tidak perlu dimasukkan. Tamu menambahkannya sendiri saat konfirmasi."],
    ["", "Baris yang emailnya sudah terdaftar, atau tanpa email dengan nama + perusahaan yang sudah ada di daftar, akan dilewati."],
    ["", `Maksimal ${MAX_IMPORT_ROWS} tamu per file. Simpan dalam format .xlsx.`],
    ["", ""],
    ["Contoh", ""],
  ]);
  const example = help.addTable({
    name: "Contoh",
    ref: `A${help.rowCount + 1}`,
    columns: TEMPLATE_COLUMNS.map((c) => ({ name: c.header })),
    rows: [
      ["Budi Santoso", "PT Maju Jaya", "budi@majujaya.co.id", "0812-3456-7890"],
      ["Siti Rahma", "CV Sentosa", "", "+62 813 1111 2222"],
    ],
  });
  example.commit();
  help.getColumn(3).width = 28;
  help.getColumn(4).width = 20;
  help.getRow(1).font = { bold: true, size: 14 };
  for (const row of [3, 4, 5, 6, 8, 12]) help.getCell(`A${row}`).font = { bold: true };

  return xlsxResponse(workbook, "template-import-tamu.xlsx");
}
