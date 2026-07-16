import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "phone required" }, { status: 400 });
  }

  const normalized = normalizePhone(phone);
  const employee = await prisma.employee.findUnique({
    where: { phone: normalized },
    select: {
      id: true,
      employee_code: true,
      name: true,
      type: true,
      is_active: true,
      allow_checkout_input: true,
    },
  });

  if (!employee || !employee.is_active) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ status: "found", employee });
}
