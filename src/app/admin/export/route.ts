import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { listGuests } from "@/lib/guests";

export const dynamic = "force-dynamic";

function csvCell(value: string) {
  // Prefix formula characters so Excel doesn't execute them.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  const guests = await listGuests();
  const lines = [
    ["Nama", "Perusahaan", "Kehadiran", "Check-in", "Waktu konfirmasi"],
    ...guests.map((g) => [
      g.name,
      g.company,
      g.attending ? "Hadir" : "Tidak hadir",
      formatDateTime(g.checked_in_at),
      formatDateTime(g.created_at),
    ]),
  ].map((row) => row.map(csvCell).join(","));

  // BOM so Excel opens UTF-8 correctly
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsvp-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
