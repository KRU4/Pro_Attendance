import { NextRequest, NextResponse } from "next/server";
import { runDailyAttendanceMarking } from "@/lib/attendance-service";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await runDailyAttendanceMarking();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
