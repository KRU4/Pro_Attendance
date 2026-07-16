"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

interface Holiday {
  id: number;
  date: string;
  label: string;
}

export default function SettingsPageClient({ userName }: { userName: string }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { showToast } = useToast();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayLabel, setHolidayLabel] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    fetch("/api/holidays")
      .then((r) => r.json())
      .then(setHolidays);
  }, []);

  const addHoliday = async () => {
    if (!holidayDate || !holidayLabel) return;
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: holidayDate, label: holidayLabel }),
    });
    if (res.ok) {
      showToast(t("holidayAdded"));
      setHolidayDate("");
      setHolidayLabel("");
      const updated = await fetch("/api/holidays").then((r) => r.json());
      setHolidays(updated);
    } else {
      showToast(tc("error"));
    }
  };

  const removeHoliday = async (id: number) => {
    const res = await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast(t("holidayRemoved"));
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } else {
      showToast(tc("error"));
    }
  };

  const regenerateToken = async () => {
    if (!confirm(t("regenerateConfirm"))) return;
    const res = await fetch("/api/api-tokens", { method: "POST" });
    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      setRevealed(true);
      showToast(t("tokenRegenerated"));
    }
  };

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      showToast(tc("copied"));
    }
  };

  return (
    <>
      <Header title={t("title")} userName={userName} />
      <main className="p-6 space-y-8">
        <section className="rounded-cell border border-border bg-white p-6">
          <h2 className="font-heading mb-4 text-base font-semibold">{t("holidays")}</h2>
          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              label={t("holidayDate")}
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
            />
            <Input
              label={t("holidayLabel")}
              value={holidayLabel}
              onChange={(e) => setHolidayLabel(e.target.value)}
            />
            <div className="flex items-end">
              <Button onClick={addHoliday}>{t("addHoliday")}</Button>
            </div>
          </div>
          {holidays.length === 0 ? (
            <p className="text-sm text-text-secondary">{t("noHolidays")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {holidays.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {h.date.slice(0, 10)} — {h.label}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => removeHoliday(h.id)}>
                    {tc("delete")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-cell border border-border bg-white p-6">
          <h2 className="font-heading mb-2 text-base font-semibold">{t("apiToken")}</h2>
          <p className="mb-4 text-sm text-text-secondary">{t("apiTokenDesc")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-cell bg-page-bg px-4 py-2 font-mono text-sm" dir="ltr">
              {revealed && token ? token : t("tokenMasked")}
            </code>
            {token && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setRevealed(!revealed)}>
                  {revealed ? tc("hide") : tc("reveal")}
                </Button>
                <Button variant="secondary" size="sm" onClick={copyToken}>
                  {tc("copy")}
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={regenerateToken}>
              {tc("regenerate")}
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
