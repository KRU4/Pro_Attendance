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

interface SalaryRow {
  employeeCode: number;
  name: string;
  absentDays: number;
  monthlySalary: number;
  deductionPerDay: number;
  totalDeduction: number;
  netSalary: number;
}

interface SalaryExportParams {
  rows: SalaryRow[];
  year: number;
  month: number;
  locale: "ar" | "en";
}

const salaryLabels = {
  ar: {
    sheet: "المرتبات",
    code: "الكود",
    name: "الاسم",
    absentDays: "أيام الغياب",
    monthlySalary: "المرتب الشهري",
    deductionPerDay: "خصم اليوم الواحد",
    totalDeduction: "إجمالي الخصم",
    netSalary: "المرتب الصافي",
  },
  en: {
    sheet: "Salaries",
    code: "Code",
    name: "Name",
    absentDays: "Absent days",
    monthlySalary: "Monthly salary",
    deductionPerDay: "Deduction/day",
    totalDeduction: "Total deduction",
    netSalary: "Net salary",
  },
};

export async function exportSalariesExcel(params: SalaryExportParams): Promise<Buffer> {
  const { rows, locale } = params;
  const t = salaryLabels[locale];
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(t.sheet);
  if (locale === "ar") {
    sheet.views = [{ rightToLeft: true }];
  }

  const headerRow = sheet.addRow([
    t.code,
    t.name,
    t.absentDays,
    t.monthlySalary,
    t.deductionPerDay,
    t.totalDeduction,
    t.netSalary,
  ]);
  headerRow.font = { bold: true };

  for (const r of rows) {
    sheet.addRow([
      r.employeeCode,
      r.name,
      r.absentDays,
      r.monthlySalary.toFixed(2),
      r.deductionPerDay.toFixed(2),
      r.totalDeduction.toFixed(2),
      r.netSalary.toFixed(2),
    ]);
  }

  sheet.columns.forEach((col) => { col.width = 16; });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
