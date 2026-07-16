"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", key: "dashboard" as const, icon: "◫" },
  { href: "/employees", key: "employees" as const, icon: "◎" },
  { href: "/attendance", key: "attendance" as const, icon: "▦" },
  { href: "/reports", key: "reports" as const, icon: "▤" },
  { href: "/settings", key: "settings" as const, icon: "⚙" },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 start-0 z-40 flex w-56 flex-col bg-brand text-white">
      <div className="border-b border-white/20 px-6 py-5">
        <p className="font-heading text-lg font-bold tracking-tight">Pro Group</p>
        <p className="text-xs text-white/70">Attendance</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-cell px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand",
                active
                  ? "bg-white/20 font-medium"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="text-base opacity-80" aria-hidden>
                {item.icon}
              </span>
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
