"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  title: string;
  userName?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function Header({ title, userName, breadcrumbs }: HeaderProps) {
  const t = useTranslations("common");
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white">
      <div className="flex h-14 items-center justify-between px-6">
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-0.5 text-xs text-text-secondary" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-1">/</span>}
                  {crumb.label}
                </span>
              ))}
            </nav>
          )}
          <h1 className="font-heading text-lg font-semibold text-text-primary">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {userName && (
            <span className="text-sm text-text-secondary">{userName}</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            {t("logout")}
          </Button>
        </div>
      </div>
    </header>
  );
}
