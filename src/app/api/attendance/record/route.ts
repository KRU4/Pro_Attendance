import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isMonthLocked } from "@/lib/attendance-logic";
import { getSystemSettings } from "@/lib/system-settings";
import { parseDateTimeInput } from "@/lib/timezone";
import { AttendanceStatus } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  employee_id: z.number(),
  date: z.string(),
  status: z.enum(["PRESENT", "ABSENT", "HOLIDAY", "INCOMPLETE"]),
  check_in_time: z.string().nullable().optional(),
  check_out_time: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

function serializeRecord(record: {
  status: AttendanceStatus;
  check_in_time: Date | null;
  check_out_time: Date | null;
  note: string | null;
  is_manual_override: boolean;
}) {
  return {
    status: record.status,
    check_in_time: record.check_in_time?.toISOString() ?? null,
    check_out_time: record.check_out_time?.toISOString() ?? null,
    note: record.note,
    is_manual_override: record.is_manual_override,
  };
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const employeeId = request.nextUrl.searchParams.get("employeeId");
  const date = request.nextUrl.searchParams.get("date");
  if (!employeeId || !date) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const dateObj = new Date(date + "T00:00:00.000Z");
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth() + 1;

  if (await isMonthLocked(year, month)) {
    return NextResponse.json({ error: "month_locked" }, { status: 403 });
  }

  try {
    await prisma.attendanceRecord.delete({
      where: {
        employee_id_date: {
          employee_id: parseInt(employeeId, 10),
          date: dateObj,
        },
      },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2025") {
      return NextResponse.json({ success: true }); // already empty, treat as success
    }
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation" }, { status: 400 });
    }

    const { employee_id, date, status, check_in_time, check_out_time, note } =
      parsed.data;

    const dateObj = new Date(date + "T00:00:00.000Z");
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth() + 1;

    if (await isMonthLocked(year, month)) {
      return NextResponse.json({ error: "month_locked" }, { status: 403 });
    }

    if (status !== "PRESENT" && !note?.trim()) {
      return NextResponse.json({ error: "note_required" }, { status: 400 });
    }

    const { timezone } = await getSystemSettings();
    const checkIn = parseDateTimeInput(date, check_in_time, timezone);
    const checkOut = parseDateTimeInput(date, check_out_time, timezone);

    const existing = await prisma.attendanceRecord.findUnique({
      where: { employee_id_date: { employee_id, date: dateObj } },
    });

    const newData = {
      employee_id,
      date: dateObj,
      status: status as AttendanceStatus,
      check_in_time: checkIn,
      check_out_time: checkOut,
      note: note ?? null,
      is_manual_override: true,
      edited_by: session.name,
      edited_at: new Date(),
    };

    let record;
    if (existing) {
      await prisma.attendanceHistory.create({
        data: {
          attendance_record_id: existing.id,
          changed_by: session.name,
          old_value: serializeRecord(existing),
          new_value: serializeRecord(newData),
        },
      });
      record = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: newData,
      });
    } else {
      record = await prisma.attendanceRecord.create({ data: newData });
      await prisma.attendanceHistory.create({
        data: {
          attendance_record_id: record.id,
          changed_by: session.name,
          old_value: {},
          new_value: serializeRecord(newData),
        },
      });
    }

    return NextResponse.json(record);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
