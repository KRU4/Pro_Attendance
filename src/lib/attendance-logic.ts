import {
  AttendanceStatus,
  Employee,
  EmployeeType,
  EmployeeWeeklyOff,
} from "@prisma/client";
import {
  eachDayOfInterval,
  endOfMonth,
  getDay,
  startOfMonth,
  parseISO,
  isSameDay,
} from "date-fns";
import { prisma } from "./prisma";
import { getSystemSettings } from "./system-settings";
import { getDayInTimezone, toDateOnly as toDateOnlyTz } from "./timezone";

export { toDateOnlyTz as toDateOnly };

export type EmployeeWithOffs = Employee & { weekly_offs: EmployeeWeeklyOff[] };

export interface DayCell {
  date: string;
  dayOfMonth: number;
  dayOfWeek: number;
  isWeeklyOff: boolean;
  isCompanyHoliday: boolean;
  isWeekendColumn: boolean;
  holidayLabel?: string;
  status: AttendanceStatus | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInTimeInput: string | null;
  checkOutTimeInput: string | null;
  note: string | null;
  isManualOverride: boolean;
  recordId: number | null;
  needsReview: boolean;
  hasNote: boolean;
}

export interface MonthSummary {
  employeeId: number;
  employeeCode: number;
  name: string;
  type: EmployeeType;
  presentDays: number;
  totalWorkingDays: number;
  absentDays: number;
  totalHours: number | null;
  requiredHours: number | null;
  requiredDays: number | null;
  hoursDifference: number | null;
  daysDifference: number | null;
  monthlySalary: number | null;
  deductionPerDay: number | null;
  totalDeduction: number | null;
  netSalary: number | null;
}

export function parseDateOnly(s: string): Date {
  return parseISO(s);
}

export function isWeeklyOffForEmployee(
  employee: EmployeeWithOffs,
  date: Date,
  timezone?: string
): boolean {
  const dow = timezone ? getDayInTimezone(date, timezone) : getDay(date);
  return employee.weekly_offs.some((o) => o.day_of_week === dow);
}

export async function getCompanyHolidaysForMonth(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);
  return prisma.companyHoliday.findMany({
    where: { date: { gte: start, lte: end } },
  });
}

export function isCompanyHoliday(
  date: Date,
  holidays: { date: Date; label: string }[]
): { isHoliday: boolean; label?: string } {
  const match = holidays.find((h) => isSameDay(h.date, date));
  return match ? { isHoliday: true, label: match.label } : { isHoliday: false };
}

export function computeHours(
  checkIn: Date | null,
  checkOut: Date | null
): number {
  if (!checkIn || !checkOut) return 0;
  return (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
}

export function formatTimeDisplay(
  d: Date | null,
  locale: string,
  timeFormat: "12h" | "24h" = "24h",
  timezone = "Africa/Cairo"
): string | null {
  if (!d) return null;
  return d.toLocaleTimeString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
    timeZone: timezone,
  });
}

export async function buildGridForMonth(
  year: number,
  month: number,
  employees: EmployeeWithOffs[],
  locale: string
) {
  const { timezone, timeFormat } = await getSystemSettings();
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  const holidays = await getCompanyHolidaysForMonth(year, month);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: start, lte: end },
      employee_id: { in: employees.map((e) => e.id) },
    },
  });

  const recordMap = new Map<string, (typeof records)[0]>();
  for (const r of records) {
    recordMap.set(`${r.employee_id}-${toDateOnlyTz(r.date, timezone)}`, r);
  }

  const formatForDisplay = (d: Date | null) =>
    formatTimeDisplay(d, locale, timeFormat, timezone);

  const formatForInput = (d: Date | null) => {
    if (!d) return null;
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      numberingSystem: "latn",
      timeZone: timezone,
    });
  };

  const grid = employees.map((emp) => {
    const cells: DayCell[] = days.map((date) => {
      const dateStr = toDateOnlyTz(date, timezone);
      const weeklyOff = isWeeklyOffForEmployee(emp, date, timezone);
      const holiday = isCompanyHoliday(date, holidays);
      const isOff = weeklyOff || holiday.isHoliday;
      const record = recordMap.get(`${emp.id}-${dateStr}`);

      let status: AttendanceStatus | null = null;
      let needsReview = false;

      if (record) {
        status = record.status;
        if (
          isOff &&
          record.check_in_time &&
          record.status === AttendanceStatus.HOLIDAY
        ) {
          needsReview = true;
        }
      } else if (isOff) {
        status = AttendanceStatus.HOLIDAY;
      } else if (dateStr < toDateOnlyTz(new Date(), timezone)) {
        status = AttendanceStatus.ABSENT;
      }

      return {
        date: dateStr,
        dayOfMonth: date.getDate(),
        dayOfWeek: getDay(date),
        isWeeklyOff: weeklyOff,
        isCompanyHoliday: holiday.isHoliday,
        isWeekendColumn: weeklyOff || holiday.isHoliday,
        holidayLabel: holiday.label,
        status,
        checkInTime: formatForDisplay(record?.check_in_time ?? null),
        checkOutTime: formatForDisplay(record?.check_out_time ?? null),
        checkInTimeInput: formatForInput(record?.check_in_time ?? null),
        checkOutTimeInput: formatForInput(record?.check_out_time ?? null),
        note: record?.note ?? null,
        isManualOverride: record?.is_manual_override ?? false,
        recordId: record?.id ?? null,
        needsReview,
        hasNote: Boolean(record?.note),
      };
    });
    return { employee: emp, cells };
  });

  return { days, grid, holidays };
}

export async function computeMonthSummary(
  year: number,
  month: number,
  employees: EmployeeWithOffs[]
): Promise<MonthSummary[]> {
  const { timezone } = await getSystemSettings();
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  const holidays = await getCompanyHolidaysForMonth(year, month);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: start, lte: end },
      employee_id: { in: employees.map((e) => e.id) },
    },
  });

  const recordMap = new Map<string, (typeof records)[0]>();
  for (const r of records) {
    recordMap.set(`${r.employee_id}-${toDateOnlyTz(r.date, timezone)}`, r);
  }

  return employees.map((emp) => {
    let presentDays = 0;
    let absentDays = 0;
    let totalWorkingDays = 0;
    let totalHours = 0;

    for (const date of days) {
      const dateStr = toDateOnlyTz(date, timezone);
      const weeklyOff = isWeeklyOffForEmployee(emp, date, timezone);
      const holiday = isCompanyHoliday(date, holidays);
      const isOff = weeklyOff || holiday.isHoliday;
      if (isOff) continue;

      totalWorkingDays++;
      const record = recordMap.get(`${emp.id}-${dateStr}`);

      if (record?.status === AttendanceStatus.PRESENT) {
        presentDays++;
        if (emp.type === EmployeeType.FIELD) {
          totalHours += computeHours(
            record.check_in_time,
            record.check_out_time
          );
        }
      } else if (
        record?.status === AttendanceStatus.ABSENT ||
        (!record && !isOff)
      ) {
        absentDays++;
      }
    }

    const requiredHours = emp.required_hours_per_month;
    const requiredDays = emp.required_days_per_month ?? totalWorkingDays;

    return {
      employeeId: emp.id,
      employeeCode: emp.employee_code,
      name: emp.name,
      type: emp.type,
      presentDays,
      totalWorkingDays,
      absentDays,
      totalHours: emp.type === EmployeeType.FIELD ? totalHours : null,
      requiredHours: emp.type === EmployeeType.FIELD ? requiredHours : null,
      requiredDays,
      hoursDifference:
        emp.type === EmployeeType.FIELD && requiredHours != null
          ? totalHours - requiredHours
          : null,
      daysDifference: presentDays - requiredDays,
      monthlySalary: emp.monthly_salary != null ? Number(emp.monthly_salary) : null,
      deductionPerDay:
        emp.absence_deduction_amount != null ? Number(emp.absence_deduction_amount) : null,
      totalDeduction:
        emp.absence_deduction_amount != null
          ? absentDays * Number(emp.absence_deduction_amount)
          : null,
      netSalary:
        emp.monthly_salary != null
          ? Number(emp.monthly_salary) -
            absentDays * Number(emp.absence_deduction_amount ?? 0)
          : null,
    };
  });
}

export async function isMonthLocked(year: number, month: number) {
  const lock = await prisma.monthLock.findUnique({
    where: { year_month: { year, month } },
  });
  return Boolean(lock);
}
