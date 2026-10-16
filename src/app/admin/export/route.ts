import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { styleHeader, xlsxResponse } from "@/lib/excel";
import { listGuests } from "@/lib/guests";

export const dynamic = "force-dynamic";

// Excel dates have no time zone, so store the Jakarta wall-clock time (UTC+7, no daylight saving).
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
function jakartaDate(iso: string | null) {
  return iso ? new Date(new Date(iso).getTime() + JAKARTA_OFFSET_MS) : null;
}

export async function GET() {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const guests = await listGuests();
  const names = new Map(guests.map((g) => [g.id, g.name]));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tamu", { views: [{ state: "frozen", ySplit: 1 }] });
  const dateFormat = "dd/mm/yyyy hh:mm";
  sheet.columns = [
    { header: "Nama", key: "name", width: 30 },
    { header: "Perusahaan", key: "company", width: 30 },
    { header: "Email", key: "email", width: 32 },
    { header: "Telepon", key: "phone", width: 18 },
    { header: "Kehadiran", key: "attending", width: 18 },
    { header: "Pendamping dari", key: "plusOneOf", width: 30 },
    { header: "Undangan dikirim", key: "invited", width: 18, style: { numFmt: dateFormat } },
    { header: "Check-in", key: "checkedIn", width: 18, style: { numFmt: dateFormat } },
    { header: "Waktu dibuat", key: "created", width: 18, style: { numFmt: dateFormat } },
  ];

  // Strings are written as text cells, never as formulas, so values like "=..." are safe.
  for (const g of guests) {
    sheet.addRow({
      name: g.name,
      company: g.company,
      email: g.email ?? "",
      phone: g.phone ?? "",
      attending: g.attending === null ? "Belum konfirmasi" : g.attending ? "Hadir" : "Tidak hadir",
      plusOneOf: g.plus_one_of ? names.get(g.plus_one_of) ?? "" : "",
      invited: jakartaDate(g.invited_at),
      checkedIn: jakartaDate(g.checked_in_at),
      created: jakartaDate(g.created_at),
    });
  }

  styleHeader(sheet);
  return xlsxResponse(workbook, `rsvp-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
