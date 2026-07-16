export function parseYearMonth(
  yearParam: string | null,
  monthParam: string | null
): { year: number; month: number } | { error: string } {
  const year = parseInt(yearParam || String(new Date().getFullYear()), 10);
  const month = parseInt(monthParam || String(new Date().getMonth() + 1), 10);

  if (isNaN(year) || year < 2000 || year > 2100) {
    return { error: "invalid_year" };
  }
  if (isNaN(month) || month < 1 || month > 12) {
    return { error: "invalid_month" };
  }

  return { year, month };
}

export function parseEmployeeId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
}
