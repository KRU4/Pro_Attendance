"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";

interface DashboardStats {
  activeEmployees: number;
  todayCheckIns: number;
  incompleteRecords: number;
  onHolidayToday: number;
  attentionItems: {
    id: number;
    employeeId: number;
    employeeName: string;
    date: string;
    status: string;
    type: string;
  }[];
}

export function DashboardHome({ userName }: { userName: string }) {
  const t = useTranslations("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: t("activeEmployees"), value: stats?.activeEmployees },
    { label: t("todayCheckIns"), value: stats?.todayCheckIns },
    { label: t("incompleteRecords"), value: stats?.incompleteRecords },
    { label: t("onHolidayToday"), value: stats?.onHolidayToday },
  ];

  return (
    <>
      <Header title={t("title")} userName={userName} />
      <main className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-cell border border-border bg-white p-5"
            >
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="tabular-nums text-3xl font-semibold text-text-primary">
                  {card.value ?? 0}
                </p>
              )}
              <p className="mt-1 text-sm text-text-secondary">{card.label}</p>
            </div>
          ))}
        </div>

        <section className="mt-8">
          <h2 className="font-heading mb-4 text-base font-semibold text-text-primary">
            {t("needsAttention")}
          </h2>
          <div className="rounded-cell border border-border bg-white">
            {loading ? (
              <div className="p-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ) : stats?.attentionItems.length === 0 ? (
              <p className="p-6 text-sm text-text-secondary">{t("noAttention")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {stats?.attentionItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-6 py-3">
                    <span className="text-sm text-text-primary">
                      {item.type === "incomplete"
                        ? t("incompleteItem", { name: item.employeeName, date: item.date })
                        : t("holidayReviewItem", { name: item.employeeName, date: item.date })}
                    </span>
                    <Link
                      href={`/attendance?employee=${item.employeeId}&date=${item.date}`}
                      className="text-sm text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {t("viewAttendance")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default DashboardHome;
