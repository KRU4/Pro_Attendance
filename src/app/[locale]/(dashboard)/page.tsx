import { getSession } from "@/lib/auth";
import { setRequestLocale } from "next-intl/server";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const session = await getSession();
  return <DashboardHome userName={session?.name ?? ""} />;
}
