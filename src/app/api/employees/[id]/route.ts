import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizePhone, isValidPhone } from "@/lib/phone";
import { parseEmployeeId } from "@/lib/validation";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  type: z.enum(["OFFICE", "FIELD"]).optional(),
  allow_checkout_input: z.boolean().optional(),
  default_checkout_time: z.string().nullable().optional(),
  required_hours_per_month: z.number().nullable().optional(),
  weekly_offs: z.array(z.number().min(0).max(6)).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = parseEmployeeId(params.id);
  if (!id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { weekly_offs: true },
  });

  if (!employee) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation" }, { status: 400 });
    }

    const id = parseEmployeeId(params.id);
    if (!id) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const data = parsed.data;

    if (data.phone) {
      const phone = normalizePhone(data.phone);
      if (!isValidPhone(data.phone)) {
        return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
      }
      data.phone = phone;
    }

    const { weekly_offs, ...empData } = data;

    const employee = await prisma.$transaction(async (tx) => {
      if (weekly_offs) {
        await tx.employeeWeeklyOff.deleteMany({ where: { employee_id: id } });
        await tx.employeeWeeklyOff.createMany({
          data: weekly_offs.map((d) => ({ employee_id: id, day_of_week: d })),
        });
      }
      return tx.employee.update({
        where: { id },
        data: empData,
        include: { weekly_offs: true },
      });
    });

    return NextResponse.json(employee);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
