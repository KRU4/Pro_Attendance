import ExcelJS from "exceljs";
import { AttendanceStatus, EmployeeType } from "@prisma/client";
import { MonthSummary } from "./attendance-logic";

interface ExportParams {
  grid: {
    employee: {
      id: number;
      employee_code: number;
      name: string;
      type: EmployeeType;
    };
    cells: {
      date: string;
      dayOfMonth: number;
      status: AttendanceStatus | null;
      checkInTime: string | null;
    }[];
  }[];
  summary: MonthSummary[];
  year: number;
  month: number;
  locale: "ar" | "en";
}

const statusColors: Record<string, string> = {
  PRESENT: "FF2F9E58",
  ABSENT: "FFD64545",
  HOLIDAY: "FFC7C9CC",
  INCOMPLETE: "FFE8A93B",
};

const labels = {
  ar: {
    sheet: "الحضور",
    summary: "التقرير",
    employee: "الموظف",
    code: "الكود",
    present: "حاضر",
    absent: "غائب",
    holiday: "إجازة",
    incomplete: "غير مكتمل",
    presentDays: "أيام الحضور",
    workingDays: "أيام العمل",
    absentDays: "أيام الغياب",
    totalHours: "إجمالي الساعات",
    requiredHours: "الساعات المطلوبة",
    difference: "الفرق",
  },
  en: {
    sheet: "Attendance",
    summary: "Summary",
    employee: "Employee",
    code: "Code",
    present: "Present",
    absent: "Absent",
    holiday: "Holiday",
    incomplete: "Incomplete",
    presentDays: "Present days",
    workingDays: "Working days",
    absentDays: "Absent days",
    totalHours: "Total hours",
    requiredHours: "Required hours",
    difference: "Difference",
  },
};

export async function exportAttendanceExcel(params: ExportParams): Promise<Buffer> {
  const { grid, summary, locale } = params;
  const t = labels[locale];
  const workbook = new ExcelJS.Workbook();

  const gridSheet = workbook.addWorksheet(t.sheet);
  if (locale === "ar") {
    gridSheet.views = [{ rightToLeft: true }];
  }
  const days = grid[0]?.cells.length ?? 0;

  const headerRow = [t.employee, t.code, ...Array.from({ length: days }, (_, i) => String(i + 1))];
  gridSheet.addRow(headerRow);

  for (const row of grid) {
    const dataRow = [
      row.employee.name,
      row.employee.employee_code,
      ...row.cells.map((c) => c.checkInTime || ""),
    ];
    const excelRow = gridSheet.addRow(dataRow);

    row.cells.forEach((cell, idx) => {
      if (cell.status) {
        const col = excelRow.getCell(idx + 3);
        col.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: statusColors[cell.status] },
        };
      }
    });
  }

  const summarySheet = workbook.addWorksheet(t.summary);
  if (locale === "ar") {
    summarySheet.views = [{ rightToLeft: true }];
  }
  summarySheet.addRow([
    t.employee,
    t.presentDays,
    t.workingDays,
    t.absentDays,
    t.totalHours,
    t.requiredHours,
    t.difference,
  ]);

  for (const s of summary) {
    summarySheet.addRow([
      s.name,
      s.presentDays,
      s.totalWorkingDays,
      s.absentDays,
      s.totalHours != null ? s.totalHours.toFixed(1) : "-",
      s.requiredHours ?? "-",
      s.hoursDifference != null ? s.hoursDifference.toFixed(1) : "-",
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
