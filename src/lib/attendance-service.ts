import {
  AttendanceStatus,
  Employee,
  EmployeeType,
} from "@prisma/client";
import { prisma } from "./prisma";
import { normalizePhone } from "./phone";
import { fuzzyMatchCode } from "./employee-match";
import {
  isWeeklyOffForEmployee,
  isCompanyHoliday,
} from "./attendance-logic";
import { getSystemSettings } from "./system-settings";
import { getDayInTimezone, toDateOnly } from "./timezone";

export type CheckAction = "check_in" | "check_out";

export interface CheckRequest {
  phone: string;
  employee_code_guess: string;
  action: CheckAction;
  timestamp: string;
  location?: string;
  note?: string;
  raw_message?: string;
}

export type CheckResponse =
  | { status: "success"; employee_name: string; message: string }
  | { status: "not_found" }
  | { status: "phone_mismatch" }
  | { status: "checkout_not_allowed" }
  | { status: "already_checked_out" }
  | { status: "already_checked_in" }
  | { status: "no_check_in" };

async function resolveEmployee(
  phone: string,
  codeGuess: string
): Promise<
  | { employee: Employee; linked: boolean }
  | { error: "not_found" | "phone_mismatch" }
> {
  const normalizedPhone = normalizePhone(phone);
  const byPhone = await prisma.employee.findUnique({
    where: { phone: normalizedPhone },
    include: { weekly_offs: true },
  });

  if (byPhone) {
    if (codeGuess) {
      const guessNum = parseInt(codeGuess.replace(/\D/g, ""), 10);
      const exactMatch =
        !isNaN(guessNum) && guessNum === byPhone.employee_code;
      const fuzzy = fuzzyMatchCode(codeGuess, [byPhone.employee_code]);
      if (!exactMatch && fuzzy !== byPhone.employee_code) {
        return { error: "phone_mismatch" };
      }
    }
    return { employee: byPhone, linked: true };
  }

  const allEmployees = await prisma.employee.findMany({
    include: { weekly_offs: true },
  });
  const guessNum = parseInt(codeGuess.replace(/\D/g, ""), 10);
  if (isNaN(guessNum)) return { error: "not_found" };

  const employee = allEmployees.find((e) => e.employee_code === guessNum);
  if (!employee) return { error: "not_found" };

  await prisma.employee.update({
    where: { id: employee.id },
    data: { phone: normalizedPhone },
  });

  return {
    employee: { ...employee, phone: normalizedPhone },
    linked: false,
  };
}

async function isDayOff(
  employeeId: number,
  date: Date,
  timezone: string
): Promise<boolean> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { weekly_offs: true },
  });
  if (!employee) return false;

  const weeklyOff = isWeeklyOffForEmployee(employee, date, timezone);
  const holidays = await prisma.companyHoliday.findMany({
    where: { date },
  });
  const holiday = isCompanyHoliday(date, holidays);
  return weeklyOff || holiday.isHoliday;
}

function formatSuccessMessage(
  action: CheckAction,
  time: Date,
  name: string,
  timezone: string
): string {
  const hours = time.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
  if (action === "check_in") {
    return `تم تسجيل حضور ${name} الساعة ${hours}`;
  }
  return `تم تسجيل انصراف ${name} الساعة ${hours}`;
}

export async function processAttendanceCheck(
  req: CheckRequest
): Promise<CheckResponse> {
  const resolved = await resolveEmployee(req.phone, req.employee_code_guess);
  if ("error" in resolved) {
    return { status: resolved.error };
  }

  const { employee } = resolved;
  if (!employee.is_active) return { status: "not_found" };

  const { timezone } = await getSystemSettings();
  const timestamp = new Date(req.timestamp);
  if (isNaN(timestamp.getTime())) return { status: "not_found" };

  const dateOnly = new Date(toDateOnly(timestamp, timezone) + "T00:00:00.000Z");
  const dayOff = await isDayOff(employee.id, dateOnly, timezone);

  if (req.action === "check_out") {
    if (!employee.allow_checkout_input) {
      return { status: "checkout_not_allowed" };
    }

    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        employee_id_date: { employee_id: employee.id, date: dateOnly },
      },
    });

    if (!existing?.check_in_time) {
      return { status: "no_check_in" };
    }

    if (existing.check_out_time) {
      return { status: "already_checked_out" };
    }

    const noteParts: string[] = [];
    if (req.location) noteParts.push(req.location);
    if (req.note) noteParts.push(req.note);

    await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        check_out_time: timestamp,
        check_out_location: req.location ?? null,
        status: AttendanceStatus.PRESENT,
        note: noteParts.length
          ? [existing.note, ...noteParts].filter(Boolean).join("\n")
          : existing.note,
      },
    });

    return {
      status: "success",
      employee_name: employee.name,
      message: formatSuccessMessage("check_out", timestamp, employee.name, timezone),
    };
  }

  // check_in
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      employee_id_date: { employee_id: employee.id, date: dateOnly },
    },
  });

  if (existing?.check_in_time) {
    const attemptNote = `محاولة حضور إضافية الساعة ${timestamp.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone })}`;
    await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        note: [existing.note, attemptNote].filter(Boolean).join("\n"),
      },
    });
    return { status: "already_checked_in" };
  }

  const noteParts: string[] = [];
  if (req.location) noteParts.push(req.location);
  if (req.note) noteParts.push(req.note);

  const status = dayOff ? AttendanceStatus.HOLIDAY : AttendanceStatus.PRESENT;

  await prisma.attendanceRecord.create({
    data: {
      employee_id: employee.id,
      date: dateOnly,
      status,
      check_in_time: timestamp,
      check_in_location: req.location ?? null,
      note: noteParts.length ? noteParts.join("\n") : null,
    },
  });

  return {
    status: "success",
    employee_name: employee.name,
    message: formatSuccessMessage("check_in", timestamp, employee.name, timezone),
  };
}

/**
 * Daily cron: mark INCOMPLETE for FIELD employees with only check-in,
 * and ABSENT for working days with no record.
 * OFFICE employees get implicit checkout via default_checkout_time for hour calc
 * but check_out_time is NOT written — hours for OFFICE are day-count based only.
 */
export async function runDailyAttendanceMarking(targetDate?: Date) {
  const { timezone } = await getSystemSettings();
  const date = targetDate ?? new Date();
  date.setDate(date.getDate() - 1);
  const dateOnly = new Date(toDateOnly(date, timezone) + "T00:00:00.000Z");

  const employees = await prisma.employee.findMany({
    where: { is_active: true },
    include: { weekly_offs: true },
  });

  const holidays = await prisma.companyHoliday.findMany({
    where: { date: dateOnly },
  });

  for (const emp of employees) {
    const dow = getDayInTimezone(dateOnly, timezone);
    const isWeeklyOff = emp.weekly_offs.some((o) => o.day_of_week === dow);
    const isHoliday = holidays.some((h) =>
      h.date.toISOString().startsWith(toDateOnly(dateOnly, timezone))
    );
    const isOff = isWeeklyOff || isHoliday;

    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        employee_id_date: { employee_id: emp.id, date: dateOnly },
      },
    });

    if (isOff) continue;

    if (existing) {
      if (
        existing.check_in_time &&
        !existing.check_out_time &&
        emp.type === EmployeeType.FIELD
      ) {
        await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { status: AttendanceStatus.INCOMPLETE },
        });
      } else if (
        existing.check_in_time &&
        !existing.check_out_time &&
        emp.type === EmployeeType.OFFICE
      ) {
        // OFFICE: implicit checkout at default_checkout_time — count as PRESENT
        // We do NOT write check_out_time per spec; day is present if checked in
        await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { status: AttendanceStatus.PRESENT },
        });
      }
    } else {
      await prisma.attendanceRecord.create({
        data: {
          employee_id: emp.id,
          date: dateOnly,
          status: AttendanceStatus.ABSENT,
        },
      });
    }
  }
}
