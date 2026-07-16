import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizePhone, isValidPhone } from "@/lib/phone";
import { EmployeeType } from "@prisma/client";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string(),
  type: z.enum(["OFFICE", "FIELD"]),
  allow_checkout_input: z.boolean().optional(),
  default_checkout_time: z.string().nullable().optional(),
  required_hours_per_month: z.number().nullable().optional(),
  weekly_offs: z.array(z.number().min(0).max(6)),
  is_active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const search = request.nextUrl.searchParams.get("search") || "";
  const type = request.nextUrl.searchParams.get("type");
  const active = request.nextUrl.searchParams.get("active");

  const employees = await prisma.employee.findMany({
    where: {
      ...(type && type !== "ALL" ? { type: type as EmployeeType } : {}),
      ...(active === "true" ? { is_active: true } : active === "false" ? { is_active: false } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              ...(isNaN(Number(search)) ? [] : [{ employee_code: Number(search) }]),
            ],
          }
        : {}),
    },
    include: { weekly_offs: true },
    orderBy: { employee_code: "asc" },
  });

  return NextResponse.json(employees);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation", details: parsed.error }, { status: 400 });
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!isValidPhone(parsed.data.phone)) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }

    const maxCode = await prisma.employee.aggregate({ _max: { employee_code: true } });
    const nextCode = (maxCode._max.employee_code ?? 1000) + 1;

    const employee = await prisma.employee.create({
      data: {
        employee_code: nextCode,
        name: parsed.data.name,
        phone,
        type: parsed.data.type,
        allow_checkout_input:
          parsed.data.allow_checkout_input ?? parsed.data.type === "FIELD",
        default_checkout_time:
          parsed.data.default_checkout_time ??
          (parsed.data.type === "OFFICE" ? "18:00" : null),
        required_days_per_month: null,
        required_hours_per_month: parsed.data.required_hours_per_month ?? null,
        is_active: parsed.data.is_active ?? true,
        weekly_offs: {
          create: parsed.data.weekly_offs.map((d) => ({ day_of_week: d })),
        },
      },
      include: { weekly_offs: true },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "duplicate_phone" }, { status: 409 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
