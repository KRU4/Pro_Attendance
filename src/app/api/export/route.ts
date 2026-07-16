import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildGridForMonth,
  computeMonthSummary,
} from "@/lib/attendance-logic";
import { exportAttendanceExcel } from "@/lib/excel-export";
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
  const type = request.nextUrl.searchParams.get("type") || "ALL";
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  const locale = (request.nextUrl.searchParams.get("locale") || "ar") as "ar" | "en";
  const mode = request.nextUrl.searchParams.get("mode") || "all";

  const employees = await prisma.employee.findMany({
    where: {
      is_active: true,
      ...(type !== "ALL" ? { type: type as EmployeeType } : {}),
      ...(mode === "selected" && employeeId
        ? { id: parseInt(employeeId) }
        : {}),
      ...(mode === "byType" && type !== "ALL"
        ? { type: type as EmployeeType }
        : {}),
    },
    include: { weekly_offs: true },
    orderBy: { name: "asc" },
  });

  const { grid } = await buildGridForMonth(year, month, employees, locale);
  const summary = await computeMonthSummary(year, month, employees);

  const buffer = await exportAttendanceExcel({
    grid,
    summary,
    year,
    month,
    locale,
  });

  const filename = `attendance-${year}-${month}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
