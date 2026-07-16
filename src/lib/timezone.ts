export const DEFAULT_TIMEZONE = "Africa/Cairo";

export function toDateOnly(d: Date, timezone = DEFAULT_TIMEZONE): string {
  return d.toLocaleDateString("en-CA", { timeZone: timezone });
}

export function getDayInTimezone(d: Date, timezone = DEFAULT_TIMEZONE): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

/** Convert a local date + time in a timezone to a UTC Date. */
export function combineDateAndTime(
  dateStr: string,
  timeStr: string,
  timeZone: string
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  let ms = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 6; attempt++) {
    const parts = formatter.formatToParts(new Date(ms));
    const p = Object.fromEntries(
      parts.filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)])
    );

    if (
      p.year === year &&
      p.month === month &&
      p.day === day &&
      p.hour === hour &&
      p.minute === minute
    ) {
      break;
    }

    const minuteDiff = (hour - p.hour) * 60 + (minute - p.minute);
    const dayDiff = day - p.day;
    ms += minuteDiff * 60 * 1000 + dayDiff * 24 * 60 * 60 * 1000;
  }

  return new Date(ms);
}

export function parseDateTimeInput(
  dateStr: string,
  value: string | null | undefined,
  timeZone: string
): Date | null {
  if (!value) return null;
  if (value.includes("T")) {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return combineDateAndTime(dateStr, value, timeZone);
}
