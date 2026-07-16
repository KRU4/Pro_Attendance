import { NextRequest, NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth";
import { getSystemSettings, updateSystemSettings } from "@/lib/system-settings";
import { z } from "zod";

const schema = z.object({
  timezone: z.string().min(1),
  timeFormat: z.enum(["24h", "12h"]),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const settings = await getSystemSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation" }, { status: 400 });
    }

    await updateSystemSettings(parsed.data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}
