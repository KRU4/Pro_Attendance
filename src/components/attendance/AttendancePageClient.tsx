"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { GridSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { MonthSelector } from "./MonthSelector";
import { AttendanceGrid, GridCell } from "./AttendanceGrid";
import { AttendanceEditModal } from "./AttendanceEditModal";

interface GridRow {
  employee: {
    id: number;
    employee_code: number;
    name: string;
    type: string;
    allow_checkout_input: boolean;
  };
  cells: GridCell[];
}

export default function AttendancePageClient({ userName }: { userName: string }) {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const deepLinkHandled = useRef(false);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [grid, setGrid] = useState<GridRow[]>([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editCell, setEditCell] = useState<{
    employeeId: number;
    employeeName: string;
    allowCheckout: boolean;
    cell: GridCell;
  } | null>(null);

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (!dateParam) return;
    const [y, m] = dateParam.split("-").map(Number);
    if (y && m >= 1 && m <= 12) {
      setYear(y);
      setMonth(m);
    }
  }, [searchParams]);

  const fetchGrid = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      locale,
      view: "grid",
    });
    if (typeFilter !== "ALL") params.set("type", typeFilter);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/attendance?${params}`);
      if (!res.ok) {
        showToast(tc("error"));
        setGrid([]);
        setLocked(false);
        return;
      }
      const data = await res.json();
      setGrid(data.grid ?? []);
      setLocked(data.locked ?? false);
    } catch {
      showToast(tc("error"));
      setGrid([]);
      setLocked(false);
    } finally {
      setLoading(false);
    }
  }, [year, month, typeFilter, search, locale, showToast, tc]);

  useEffect(() => {
    const timer = setTimeout(fetchGrid, 200);
    return () => clearTimeout(timer);
  }, [fetchGrid]);

  useEffect(() => {
    if (loading || locked || deepLinkHandled.current || grid.length === 0) return;

    const employeeId = searchParams.get("employee");
    const date = searchParams.get("date");
    if (!employeeId || !date) return;

    const row = grid.find((r) => r.employee.id === parseInt(employeeId, 10));
    const cell = row?.cells.find((c) => c.date === date);
    if (row && cell) {
      deepLinkHandled.current = true;
      setEditCell({
        employeeId: row.employee.id,
        employeeName: row.employee.name,
        allowCheckout: row.employee.allow_checkout_input,
        cell,
      });
    }
  }, [grid, loading, locked, searchParams]);

  const handleMonthChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
  };

  const handleCloseMonth = async () => {
    if (!confirm(t("closeMonthConfirm"))) return;
    const res = await fetch("/api/months/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });
    if (res.ok) {
      showToast(t("monthClosed"));
      fetchGrid();
    } else {
      showToast(tc("error"));
    }
  };

  const handleUnlockMonth = async () => {
    if (!confirm(t("unlockMonthConfirm"))) return;
    const res = await fetch("/api/months/lock", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });
    if (res.ok) {
      showToast(t("monthUnlocked"));
      fetchGrid();
    } else {
      showToast(tc("error"));
    }
  };

  return (
    <>
      <Header title={t("title")} userName={userName} />
      <main className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <MonthSelector
            year={year}
            month={month}
            onChange={handleMonthChange}
            onCloseMonth={handleCloseMonth}
            onUnlockMonth={handleUnlockMonth}
            locked={locked}
            showCloseButton
          />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-cell border border-border px-3 py-2 text-sm"
          >
            <option value="ALL">{tc("all")}</option>
            <option value="OFFICE">{tc("office")}</option>
            <option value="FIELD">{tc("field")}</option>
          </select>
        </div>

        {locked && (
          <div className="mb-4 rounded-cell border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            {t("monthLocked")}
          </div>
        )}

        {loading ? (
          <GridSkeleton />
        ) : (
          <AttendanceGrid
            grid={grid}
            locked={locked}
            onCellClick={(employeeId, cell) => {
              const row = grid.find((r) => r.employee.id === employeeId);
              if (!row || locked) return;
              setEditCell({
                employeeId,
                employeeName: row.employee.name,
                allowCheckout: row.employee.allow_checkout_input,
                cell,
              });
            }}
          />
        )}
      </main>

      <AttendanceEditModal
        open={Boolean(editCell)}
        onClose={() => setEditCell(null)}
        employeeId={editCell?.employeeId ?? 0}
        employeeName={editCell?.employeeName ?? ""}
        cell={editCell?.cell ?? null}
        allowCheckout={editCell?.allowCheckout ?? false}
        onSaved={() => {
          showToast(t("saved"));
          fetchGrid();
        }}
      />
    </>
  );
}
