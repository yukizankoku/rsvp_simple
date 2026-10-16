import "server-only";
import type ExcelJS from "exceljs";
import { NextResponse } from "next/server";

/** Bold white header on the brand color, frozen and filterable. Shared by the export and the import template. */
export function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1660F5" } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
}

export async function xlsxResponse(workbook: ExcelJS.Workbook, fileName: string) {
  const file = await workbook.xlsx.writeBuffer();
  return new NextResponse(file as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
