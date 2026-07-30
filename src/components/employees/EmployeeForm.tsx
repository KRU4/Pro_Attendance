"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Employee {
  id: number;
  employee_code: number;
  name: string;
  phone: string;
  type: "OFFICE" | "FIELD";
  is_active: boolean;
  allow_checkout_input: boolean;
  default_checkout_time: string | null;
  required_days_per_month: number | null;
  required_hours_per_month: number | null;
  monthly_salary: number | null;
  absence_deduction_amount: number | null;
  weekly_offs: { day_of_week: number }[];
}

interface Props {
  employee: Employee | null;
  onSaved: () => void;
  onCancel: () => void;
}

const DEFAULT_OFFS = [5, 6];

export function EmployeeForm({ employee, onSaved, onCancel }: Props) {
  const t = useTranslations("employees");
  const tc = useTranslations("common");
  const tv = useTranslations("common.validation");

  const [name, setName] = useState(employee?.name ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [type, setType] = useState<"OFFICE" | "FIELD">(employee?.type ?? "OFFICE");
  const [allowCheckout, setAllowCheckout] = useState(
    employee?.allow_checkout_input ?? false
  );
  const [defaultCheckout, setDefaultCheckout] = useState(
    employee?.default_checkout_time ?? "18:00"
  );
  const [requiredHours, setRequiredHours] = useState(
    String(employee?.required_hours_per_month ?? "")
  );
  const [monthlySalary, setMonthlySalary] = useState(
    String(employee?.monthly_salary ?? "")
  );
  const [absenceDeduction, setAbsenceDeduction] = useState(
    String(employee?.absence_deduction_amount ?? "")
  );
  const [weeklyOffs, setWeeklyOffs] = useState<number[]>(
    employee?.weekly_offs.map((o) => o.day_of_week) ?? DEFAULT_OFFS
  );
  const [isActive, setIsActive] = useState(employee?.is_active ?? true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleDay = (day: number) => {
    setWeeklyOffs((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      name,
      phone,
      type,
      allow_checkout_input: type === "FIELD" ? allowCheckout : false,
      default_checkout_time: type === "OFFICE" ? defaultCheckout : null,
      required_days_per_month: null,
      required_hours_per_month:
        type === "FIELD" && requiredHours ? parseInt(requiredHours) : null,
      monthly_salary: monthlySalary ? parseFloat(monthlySalary) : null,
      absence_deduction_amount: absenceDeduction ? parseFloat(absenceDeduction) : null,
      weekly_offs: weeklyOffs,
      is_active: isActive,
    };

    const url = employee ? `/api/employees/${employee.id}` : "/api/employees";
    const method = employee ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error === "invalid_phone" ? tv("invalidPhone") : tc("error"));
      setLoading(false);
      return;
    }

    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label={t("name")} value={name} onChange={(e) => setName(e.target.value)} required />
      <Input
        label={t("phone")}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        dir="ltr"
      />

      <div>
        <p className="mb-2 text-sm font-medium">{t("type")}</p>
        <div className="flex gap-4">
          {(["OFFICE", "FIELD"] as const).map((tp) => (
            <label key={tp} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                checked={type === tp}
                onChange={() => {
                  setType(tp);
                  if (tp === "FIELD") setAllowCheckout(true);
                }}
              />
              {tp === "OFFICE" ? tc("office") : tc("field")}
            </label>
          ))}
        </div>
      </div>

      {type === "FIELD" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowCheckout}
            onChange={(e) => setAllowCheckout(e.target.checked)}
          />
          {t("allowCheckout")}
        </label>
      )}

      {type === "OFFICE" && (
        <Input
          label={t("defaultCheckout")}
          type="time"
          value={defaultCheckout}
          onChange={(e) => setDefaultCheckout(e.target.value)}
        />
      )}

      {type === "FIELD" && (
        <div className="grid grid-cols-1 gap-4">
          <Input
            label={t("requiredHours")}
            type="number"
            value={requiredHours}
            onChange={(e) => setRequiredHours(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t("salary")}
          type="number"
          value={monthlySalary}
          onChange={(e) => setMonthlySalary(e.target.value)}
        />
        <Input
          label={t("absenceDeduction")}
          type="number"
          value={absenceDeduction}
          onChange={(e) => setAbsenceDeduction(e.target.value)}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{t("weeklyOff")}</p>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <label
              key={day}
              className="flex cursor-pointer items-center gap-1 rounded-cell border border-border px-2 py-1 text-xs"
            >
              <input
                type="checkbox"
                checked={weeklyOffs.includes(day)}
                onChange={() => toggleDay(day)}
              />
              {tc(`days.${day}`)}
            </label>
          ))}
        </div>
      </div>

      {employee && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          {tc("active")}
        </label>
      )}

      {error && <p className="text-sm text-status-absent">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
