import "server-only";
import ExcelJS from "exceljs";
import { clean, MAX_LEN, toKey, type Guest, type NewGuest } from "./guests";
import { EMAIL_PATTERN, isValidPhone } from "./validation";

type Field = "name" | "company" | "email" | "phone";

/** Columns of the import template, in order. The export uses the same header names, so it can be imported too. */
export const TEMPLATE_COLUMNS: { header: string; key: Field; width: number }[] = [
  { header: "Nama", key: "name", width: 30 },
  { header: "Perusahaan", key: "company", width: 30 },
  { header: "Email", key: "email", width: 32 },
  { header: "Telepon", key: "phone", width: 20 },
];

// Header names people commonly use, compared lowercased with everything but letters removed
// ("No. Telepon" → "notelepon", "E-mail" → "email").
const HEADERS: Record<string, Field> = {
  nama: "name", name: "name", namalengkap: "name", namatamu: "name",
  perusahaan: "company", namaperusahaan: "company", company: "company", instansi: "company",
  email: "email", alamatemail: "email",
  telepon: "phone", notelepon: "phone", nomortelepon: "phone", telp: "phone", notelp: "phone",
  phone: "phone", hp: "phone", nohp: "phone", whatsapp: "phone", wa: "phone", nowa: "phone",
};

export const MAX_IMPORT_ROWS = 2000;

export class ImportError extends Error {}

export type SheetRow = { row: number } & NewGuest;
export type Skipped = { row: number; name: string; reason: string };

/** Read the guest rows from the first sheet whose first row has a "Nama" and a "Perusahaan" column. */
export async function readGuestSheet(file: ArrayBuffer): Promise<SheetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);

  for (const sheet of workbook.worksheets) {
    const columns = new Map<Field, number>();
    sheet.getRow(1).eachCell((cell, col) => {
      const field = HEADERS[cell.text.toLowerCase().replace(/[^a-z]/g, "")];
      if (field && !columns.has(field)) columns.set(field, col);
    });
    if (!columns.has("name") || !columns.has("company")) continue;

    const rows: SheetRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cell = (field: Field) => {
        const col = columns.get(field);
        return col ? row.getCell(col) : null;
      };
      const text = (field: Field) => clean(cell(field)?.text ?? "");
      rows.push({
        row: rowNumber,
        name: text("name"),
        company: text("company"),
        email: text("email").toLowerCase(),
        phone: phoneText(cell("phone")),
      });
    });
    // Rows with nothing filled in (e.g. formatted but empty) are not counted.
    const filled = rows.filter((r) => r.name || r.company || r.email || r.phone);
    if (filled.length > MAX_IMPORT_ROWS) {
      throw new ImportError(`Maksimal ${MAX_IMPORT_ROWS} tamu per file. Bagi file menjadi beberapa bagian.`);
    }
    return filled;
  }
  throw new ImportError('Kolom "Nama" dan "Perusahaan" tidak ditemukan di baris pertama. Gunakan template Excel.');
}

function phoneText(cell: ExcelJS.Cell | null) {
  if (!cell) return "";
  const text = clean(cell.text);
  // A phone number typed into a number cell loses its leading 0: 81234567890 → 081234567890.
  return cell.type === ExcelJS.ValueType.Number && /^8\d{7,12}$/.test(text) ? `0${text}` : text;
}

/**
 * Decide which rows to add. A row is skipped when it is invalid, when its email is already used,
 * or when it has no email and the same name + company is already on the list (most likely the
 * same file imported twice; that guest can still be added by hand).
 */
export function planImport(rows: SheetRow[], existing: Guest[]) {
  const emails = new Set(existing.flatMap((g) => (g.email ? [g.email] : [])));
  const people = new Set(existing.map((g) => `${toKey(g.name)}\n${toKey(g.company)}`));
  const add: NewGuest[] = [];
  const skipped: Skipped[] = [];

  for (const r of rows) {
    const person = `${toKey(r.name)}\n${toKey(r.company)}`;
    let reason = "";
    if (!r.name || !r.company) reason = "Nama dan perusahaan wajib diisi";
    else if (r.name.length > MAX_LEN || r.company.length > MAX_LEN) reason = "Nama atau perusahaan terlalu panjang";
    else if (r.email && (r.email.length > 254 || !EMAIL_PATTERN.test(r.email))) reason = `Email tidak valid: ${r.email}`;
    else if (r.phone && !isValidPhone(r.phone)) reason = `Nomor telepon tidak valid: ${r.phone}`;
    else if (r.email && emails.has(r.email)) reason = `Email ${r.email} sudah dipakai tamu lain`;
    else if (!r.email && people.has(person)) reason = "Nama dan perusahaan ini sudah ada di daftar";

    if (reason) {
      skipped.push({ row: r.row, name: r.name || "(tanpa nama)", reason });
      continue;
    }
    add.push({ name: r.name, company: r.company, email: r.email, phone: r.phone });
    if (r.email) emails.add(r.email);
    people.add(person);
  }
  return { add, skipped };
}
