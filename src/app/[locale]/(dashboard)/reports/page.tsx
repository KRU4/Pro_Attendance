import { getSession } from "@/lib/auth";
import { setRequestLocale } from "next-intl/server";
import ReportsPageClient from "@/components/reports/ReportsPageClient";

export default async function ReportsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const session = await getSession();
  return <ReportsPageClient userName={session?.name ?? ""} />;
}
