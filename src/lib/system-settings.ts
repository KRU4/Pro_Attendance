import { prisma } from "./prisma";

export type TimeFormat = "24h" | "12h";

const DEFAULT_TIMEZONE = "Africa/Cairo";
const DEFAULT_TIME_FORMAT: TimeFormat = "24h";

export async function getSystemSettings() {
  const settings = await prisma.appSetting.findMany({
    where: { key: { in: ["APP_TIMEZONE", "APP_TIME_FORMAT"] } },
  });
  const map = new Map(settings.map((s) => [s.key, s.value]));

  const timezone = map.get("APP_TIMEZONE") || DEFAULT_TIMEZONE;
  const timeFormat = (map.get("APP_TIME_FORMAT") as TimeFormat) || DEFAULT_TIME_FORMAT;

  return { timezone, timeFormat };
}

export async function updateSystemSettings(input: {
  timezone: string;
  timeFormat: TimeFormat;
}) {
  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: "APP_TIMEZONE" },
      update: { value: input.timezone },
      create: { key: "APP_TIMEZONE", value: input.timezone },
    }),
    prisma.appSetting.upsert({
      where: { key: "APP_TIME_FORMAT" },
      update: { value: input.timeFormat },
      create: { key: "APP_TIME_FORMAT", value: input.timeFormat },
    }),
  ]);
}
