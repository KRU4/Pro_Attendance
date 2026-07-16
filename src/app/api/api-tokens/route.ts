import { NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth";
import { regenerateApiToken } from "@/lib/api-token";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    await requireAdmin();
    const token = await regenerateApiToken();
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const activeToken = await prisma.apiToken.findFirst({
    where: { is_active: true },
  });
  return NextResponse.json({ hasToken: Boolean(activeToken) });
}
