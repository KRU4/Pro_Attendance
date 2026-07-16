import { NextRequest, NextResponse } from "next/server";
import { validateApiToken } from "@/lib/api-token";
import { processAttendanceCheck } from "@/lib/attendance-service";
import { z } from "zod";

const schema = z.object({
  phone: z.string(),
  employee_code_guess: z.string(),
  action: z.enum(["check_in", "check_out"]),
  timestamp: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid timestamp",
  }),
  location: z.string().optional(),
  note: z.string().optional(),
  raw_message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!(await validateApiToken(auth))) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ status: "invalid_request" }, { status: 400 });
    }

    const result = await processAttendanceCheck(parsed.data);
    const statusCode =
      result.status === "success"
        ? 200
        : result.status === "not_found"
          ? 404
          : result.status === "already_checked_in"
            ? 409
            : 400;

    return NextResponse.json(result, { status: statusCode });
  } catch (err) {
    console.error("Attendance check error:", err);
    return NextResponse.json({ status: "server_error" }, { status: 500 });
  }
}
