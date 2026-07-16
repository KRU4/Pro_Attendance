"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: "ar" | "en") => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 rounded-cell border border-border p-0.5 text-sm">
      <button
        onClick={() => switchLocale("ar")}
        className={cn(
          "rounded px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          locale === "ar" ? "bg-brand text-white font-medium" : "text-text-secondary hover:text-text-primary"
        )}
      >
        AR
      </button>
      <button
        onClick={() => switchLocale("en")}
        className={cn(
          "rounded px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          locale === "en" ? "bg-brand text-white font-medium" : "text-text-secondary hover:text-text-primary"
        )}
      >
        EN
      </button>
    </div>
  );
}
