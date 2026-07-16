"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { AttendanceStatus } from "@prisma/client";

export interface GridCell {
  date: string;
  dayOfMonth: number;
  dayOfWeek: number;
  isWeeklyOff: boolean;
  isCompanyHoliday: boolean;
  isWeekendColumn: boolean;
  holidayLabel?: string;
  status: AttendanceStatus | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInTimeInput: string | null;
  checkOutTimeInput: string | null;
  note: string | null;
  isManualOverride: boolean;
  recordId: number | null;
  needsReview: boolean;
  hasNote: boolean;
}

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

interface AttendanceGridProps {
  grid: GridRow[];
  locked: boolean;
  onCellClick: (employeeId: number, cell: GridCell) => void;
}

const statusClass: Record<string, string> = {
  PRESENT: "status-present",
  ABSENT: "status-absent",
  HOLIDAY: "status-holiday",
  INCOMPLETE: "status-incomplete",
};

export function AttendanceGrid({ grid, locked, onCellClick }: AttendanceGridProps) {
  const t = useTranslations("common");
  const ta = useTranslations("attendance");

  if (grid.length === 0) {
    return (
      <div className="rounded-cell border border-border bg-white p-12 text-center text-text-secondary">
        {ta("empty")}
      </div>
    );
  }

  const days = grid[0].cells;

  return (
    <div className="overflow-auto rounded-cell border border-border bg-white">
      <table className="border-collapse text-xs">
        <thead className="sticky top-0 z-20 bg-white">
          <tr>
            <th className="sticky start-0 z-30 min-w-[140px] border-b border-e border-border bg-white px-3 py-2 text-start font-medium text-text-secondary">
              {ta("employee")}
            </th>
            {days.map((day) => (
              <th
                key={day.date}
                className={cn(
                  "min-w-[44px] border-b border-border px-1 py-2 text-center font-medium",
                  day.isWeekendColumn && "bg-gray-50"
                )}
              >
                <div className="tabular-nums">{day.dayOfMonth}</div>
                <div className="text-[10px] text-text-secondary">
                  {t(`daysShort.${day.dayOfWeek}`)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row) => (
            <tr key={row.employee.id}>
              <td className="sticky start-0 z-10 border-b border-e border-border bg-white px-3 py-2 font-medium text-text-primary">
                {row.employee.name}
              </td>
              {row.cells.map((cell) => {
                const label = cell.status
                  ? t(`status.${cell.status}`)
                  : cell.isWeekendColumn
                    ? t("status.HOLIDAY")
                    : ta("noRecord");

                return (
                  <td
                    key={cell.date}
                    className={cn(
                      "border-b border-border p-0.5",
                      cell.isWeekendColumn && "bg-gray-50/80"
                    )}
                  >
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onCellClick(row.employee.id, cell)}
                      aria-label={`${row.employee.name} — ${cell.date} — ${label}`}
                      title={cell.note || label}
                      className={cn(
                        "relative flex h-10 w-10 flex-col items-center justify-center rounded-cell px-0.5 text-[10px] text-white transition-shadow",
                        cell.status ? statusClass[cell.status] : "bg-transparent",
                        !locked && "hover:ring-2 hover:ring-text-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                        locked && "cursor-default opacity-90"
                      )}
                    >
                      {cell.checkInTime && cell.checkOutTime ? (
                        <div className="flex flex-col items-center leading-none">
                          <span className="tabular-nums">{cell.checkInTime}</span>
                          <span className="mt-0.5 tabular-nums opacity-90">
                            {cell.checkOutTime}
                          </span>
                        </div>
                      ) : cell.checkInTime ? (
                        <span className="tabular-nums leading-none">{cell.checkInTime}</span>
                      ) : null}
                      {cell.hasNote && (
                        <span
                          className="absolute top-0.5 end-0.5 h-1.5 w-1.5 rounded-full bg-white/90"
                          aria-hidden
                        />
                      )}
                      {cell.needsReview && (
                        <span
                          className="pulse-dot absolute bottom-1 h-2 w-2 rounded-full bg-white"
                          aria-label="needs review"
                        />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
