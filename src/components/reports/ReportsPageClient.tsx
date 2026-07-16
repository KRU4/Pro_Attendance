"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { MonthSelector } from "@/components/attendance/MonthSelector";
import { cn } from "@/lib/utils";

interface SummaryRow {
  employeeId: number;
  employeeCode: number;
  name: string;
  type: "OFFICE" | "FIELD";
  presentDays: number;
  totalWorkingDays: number;
  absentDays: number;
  totalHours: number | null;
  requiredHours: number | null;
  requiredDays: number | null;
  hoursDifference: number | null;
  daysDifference: number | null;
}

export default function ReportsPageClient({ userName }: { userName: string }) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { showToast } = useToast();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      view: "summary",
    });
    if (typeFilter !== "ALL") params.set("type", typeFilter);

    try {
      const res = await fetch(`/api/attendance?${params}`);
      if (!res.ok) {
        showToast(tc("error"));
        setSummary([]);
        return;
      }
      const data = await res.json();
      setSummary(data.summary ?? []);
    } catch {
      showToast(tc("error"));
      setSummary([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, typeFilter, showToast, tc]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const download = (mode: string, extra?: Record<string, string>) => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      locale,
      mode,
      ...extra,
    });
    if (typeFilter !== "ALL") params.set("type", typeFilter);
    window.open(`/api/export?${params}`, "_blank");
    showToast(t("exported"));
  };

  const diffColor = (val: number | null) => {
    if (val == null) return "";
    if (val >= 0) return "text-status-present";
    if (val > -8) return "text-status-incomplete";
    return "text-status-absent";
  };

  return (
    <>
      <Header title={t("title")} userName={userName} />
      <main className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-cell border border-border px-3 py-2 text-sm"
          >
            <option value="ALL">{tc("all")}</option>
            <option value="OFFICE">{tc("office")}</option>
            <option value="FIELD">{tc("field")}</option>
          </select>
          <div className="ms-auto flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => download("all")}>
              {t("exportAll")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!selectedId}
              onClick={() =>
                selectedId &&
                download("selected", { employeeId: String(selectedId) })
              }
            >
              {t("exportSelected")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={typeFilter === "ALL"}
              onClick={() => download("byType", { type: typeFilter })}
            >
              {t("exportByType")}
            </Button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="overflow-x-auto rounded-cell border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-page-bg text-text-secondary">
                  <th className="w-8 px-2 py-3" />
                  <th className="px-4 py-3 text-start font-medium">{t("employee")}</th>
                  <th className="px-4 py-3 text-start font-medium tabular-nums">{t("presentDays")}</th>
                  <th className="px-4 py-3 text-start font-medium tabular-nums">{t("workingDays")}</th>
                  <th className="px-4 py-3 text-start font-medium tabular-nums">{t("absentDays")}</th>
                  <th className="px-4 py-3 text-start font-medium tabular-nums">{t("totalHours")}</th>
                  <th className="px-4 py-3 text-start font-medium tabular-nums">{t("requiredHours")}</th>
                  <th className="px-4 py-3 text-start font-medium tabular-nums">{t("difference")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr
                    key={row.employeeId}
                    className={cn(
                      "border-b border-border last:border-0 cursor-pointer hover:bg-page-bg",
                      selectedId === row.employeeId && "bg-blue-50"
                    )}
                    onClick={() => setSelectedId(row.employeeId)}
                  >
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedId === row.employeeId}
                        onChange={() => setSelectedId(row.employeeId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="tabular-nums px-4 py-3">{row.presentDays}</td>
                    <td className="tabular-nums px-4 py-3">{row.totalWorkingDays}</td>
                    <td className="tabular-nums px-4 py-3">{row.absentDays}</td>
                    <td className="tabular-nums px-4 py-3">
                      {row.totalHours != null ? row.totalHours.toFixed(1) : "—"}
                    </td>
                    <td className="tabular-nums px-4 py-3">
                      {row.requiredHours ?? "—"}
                    </td>
                    <td
                      className={cn(
                        "tabular-nums px-4 py-3 font-medium",
                        diffColor(row.hoursDifference)
                      )}
                    >
                      {row.hoursDifference != null
                        ? `${row.hoursDifference > 0 ? "+" : ""}${row.hoursDifference.toFixed(1)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
