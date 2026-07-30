import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeMonthSummary } from "@/lib/attendance-logic";
import { exportSalariesExcel } from "@/lib/excel-export";
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
  const locale = (request.nextUrl.searchParams.get("locale") || "ar") as "ar" | "en";

  const employees = await prisma.employee.findMany({
    where: {
      is_active: true,
      ...(type !== "ALL" ? { type: type as EmployeeType } : {}),
    },
    include: { weekly_offs: true },
    orderBy: { name: "asc" },
  });

  const summary = await computeMonthSummary(year, month, employees);

  const rows = employees.map((emp) => {
    const s = summary.find((x) => x.employeeId === emp.id);
    const absentDays = s?.absentDays ?? 0;
    const monthlySalary = emp.monthly_salary ? Number(emp.monthly_salary) : 0;
    const deductionPerDay = emp.absence_deduction_amount
      ? Number(emp.absence_deduction_amount)
      : 0;
    const totalDeduction = absentDays * deductionPerDay;
    const netSalary = monthlySalary - totalDeduction;

    return {
      employeeCode: emp.employee_code,
      name: emp.name,
      absentDays,
      monthlySalary,
      deductionPerDay,
      totalDeduction,
      netSalary,
    };
  });

  const buffer = await exportSalariesExcel({ rows, year, month, locale });

  const filename = `salaries-${year}-${month}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
