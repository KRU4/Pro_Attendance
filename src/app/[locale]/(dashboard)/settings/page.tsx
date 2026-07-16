import { getSession } from "@/lib/auth";
import { setRequestLocale } from "next-intl/server";
import SettingsPageClient from "@/components/settings/SettingsPageClient";

export default async function SettingsPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const session = await getSession();
  return <SettingsPageClient userName={session?.name ?? ""} />;
}
