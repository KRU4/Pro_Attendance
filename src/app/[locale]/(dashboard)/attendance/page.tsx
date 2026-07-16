import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { setRequestLocale } from "next-intl/server";
import AttendancePageClient from "@/components/attendance/AttendancePageClient";
import { GridSkeleton } from "@/components/ui/Skeleton";

export default async function AttendancePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const session = await getSession();
  return (
    <Suspense fallback={<GridSkeleton />}>
      <AttendancePageClient userName={session?.name ?? ""} />
    </Suspense>
  );
}
