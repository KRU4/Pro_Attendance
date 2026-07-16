import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  buildGridForMonth,
  computeMonthSummary,
  isMonthLocked,
} from "@/lib/attendance-logic";
import { parseYearMonth } from "@/lib/validation";
import { EmployeeType } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = parseYearMonth(
    request.nextUrl.searchParams.get("year"),
    request.nextUrl.searchParams.get("month")
  );
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { year, month } = parsed;
  const type = request.nextUrl.searchParams.get("type");
  const search = request.nextUrl.searchParams.get("search") || "";
  const locale = request.nextUrl.searchParams.get("locale") || "ar";
  const view = request.nextUrl.searchParams.get("view") || "grid";

  const employees = await prisma.employee.findMany({
    where: {
      is_active: true,
      ...(type && type !== "ALL" ? { type: type as EmployeeType } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { weekly_offs: true },
    orderBy: { name: "asc" },
  });

  const locked = await isMonthLocked(year, month);

  if (view === "summary") {
    const summary = await computeMonthSummary(year, month, employees);
    return NextResponse.json({ summary, locked, year, month });
  }

  const { days, grid, holidays } = await buildGridForMonth(year, month, employees, locale);
  return NextResponse.json({
    days: days.map((d) => ({
      date: d.toISOString(),
      dayOfMonth: d.getDate(),
      dayOfWeek: d.getDay(),
    })),
    grid,
    holidays,
    locked,
    year,
    month,
  });
}
