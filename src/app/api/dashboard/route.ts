import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { toDateOnly } from "@/lib/attendance-logic";
import { getSystemSettings } from "@/lib/system-settings";
import { AttendanceStatus } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { timezone } = await getSystemSettings();
  const today = new Date();
  const todayStr = toDateOnly(today, timezone);
  const todayDate = new Date(todayStr + "T00:00:00.000Z");

  const activeEmployees = await prisma.employee.count({ where: { is_active: true } });

  const todayCheckIns = await prisma.attendanceRecord.count({
    where: {
      date: todayDate,
      check_in_time: { not: null },
    },
  });

  const incompleteRecords = await prisma.attendanceRecord.count({
    where: { status: AttendanceStatus.INCOMPLETE, date: todayDate },
  });

  const holidays = await prisma.companyHoliday.findMany({
    where: { date: todayDate },
  });

  const attentionItems = await prisma.attendanceRecord.findMany({
    where: {
      OR: [
        { status: AttendanceStatus.INCOMPLETE, date: todayDate },
        {
          status: AttendanceStatus.HOLIDAY,
          check_in_time: { not: null },
          date: todayDate,
        },
      ],
    },
    include: { employee: true },
    take: 20,
  });

  return NextResponse.json({
    activeEmployees,
    todayCheckIns,
    incompleteRecords,
    onHolidayToday: holidays.length,
    attentionItems: attentionItems.map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee.name,
      date: toDateOnly(r.date, timezone),
      status: r.status,
      type:
        r.status === AttendanceStatus.INCOMPLETE ? "incomplete" : "holiday_review",
    })),
  });
}
