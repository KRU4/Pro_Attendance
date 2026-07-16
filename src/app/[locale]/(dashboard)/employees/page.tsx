import { getSession } from "@/lib/auth";
import { setRequestLocale } from "next-intl/server";
import { EmployeesPageClient } from "@/components/employees/EmployeesPageClient";

export default async function EmployeesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const session = await getSession();
  return <EmployeesPageClient userName={session?.name ?? ""} />;
}
