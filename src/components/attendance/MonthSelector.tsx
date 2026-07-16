"use client";

import { useTranslations } from "next-intl";

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  onCloseMonth?: () => void;
  onUnlockMonth?: () => void;
  locked?: boolean;
  showCloseButton?: boolean;
}

export function MonthSelector({
  year,
  month,
  onChange,
  onCloseMonth,
  onUnlockMonth,
  locked,
  showCloseButton,
}: MonthSelectorProps) {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");

  const prev = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };

  const next = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={prev}
        className="rounded-cell border border-border px-3 py-1.5 text-sm hover:bg-page-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label={t("prevMonth")}
      >
        ‹
      </button>
      <span className="font-heading min-w-[140px] text-center font-semibold">
        {tc(`months.${month}`)} {year}
      </span>
      <button
        onClick={next}
        className="rounded-cell border border-border px-3 py-1.5 text-sm hover:bg-page-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label={t("nextMonth")}
      >
        ›
      </button>
      {showCloseButton && onCloseMonth && !locked && (
        <button
          onClick={onCloseMonth}
          className="rounded-cell border border-status-absent px-3 py-1.5 text-sm text-status-absent hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-absent"
        >
          {t("closeMonth")}
        </button>
      )}
      {locked && onUnlockMonth && (
        <button
          onClick={onUnlockMonth}
          className="rounded-cell border border-brand px-3 py-1.5 text-sm text-brand hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {t("unlockMonth")}
        </button>
      )}
      {locked && (
        <span className="rounded-cell bg-amber-50 px-3 py-1 text-xs text-amber-800">
          {t("monthLocked")}
        </span>
      )}
    </div>
  );
}
