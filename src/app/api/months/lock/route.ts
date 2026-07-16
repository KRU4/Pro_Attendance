import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin } from "@/lib/auth";
import { isMonthLocked } from "@/lib/attendance-logic";
import { parseYearMonth } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { year, month } = await request.json();

    if (!year || !month) {
      return NextResponse.json({ error: "year and month required" }, { status: 400 });
    }

    if (await isMonthLocked(year, month)) {
      return NextResponse.json({ error: "already_locked" }, { status: 400 });
    }

    await prisma.monthLock.create({
      data: { year, month, locked_by: session.name },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}

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

  const locked = await isMonthLocked(parsed.year, parsed.month);
  return NextResponse.json({ locked });
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { year, month } = await request.json();

    if (!year || !month) {
      return NextResponse.json({ error: "year and month required" }, { status: 400 });
    }

    await prisma.monthLock.delete({
      where: { year_month: { year, month } },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}
