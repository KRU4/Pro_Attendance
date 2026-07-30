"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EmployeeForm } from "@/components/employees/EmployeeForm";

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

export function EmployeesPageClient({ userName }: { userName: string }) {
  const t = useTranslations("employees");
  const tc = useTranslations("common");
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "ALL") params.set("type", typeFilter);
    if (activeFilter !== "ALL") params.set("active", activeFilter === "active" ? "true" : "false");
    const res = await fetch(`/api/employees?${params}`);
    const data = await res.json();
    setEmployees(data);
    setLoading(false);
  }, [search, typeFilter, activeFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const toggleActive = async (emp: Employee) => {
    await fetch(`/api/employees/${emp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !emp.is_active }),
    });
    showToast(emp.is_active ? t("deactivated") : t("activated"));
    fetchEmployees();
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    showToast(editing ? t("updated") : t("created"));
    fetchEmployees();
  };

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(t("confirmDelete", { name: emp.name }))) return;
    const res = await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
    if (res.ok) {
      showToast(t("deleted"));
      fetchEmployees();
    } else {
      showToast(tc("error"));
    }
  };

  return (
    <>
      <Header
        title={t("title")}
        userName={userName}
        breadcrumbs={[{ label: t("title") }]}
      />
      <main className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
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
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded-cell border border-border px-3 py-2 text-sm"
          >
            <option value="ALL">{tc("all")}</option>
            <option value="active">{tc("active")}</option>
            <option value="inactive">{tc("inactive")}</option>
          </select>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="ms-auto"
          >
            {t("addEmployee")}
          </Button>
        </div>

        {loading ? (
          <TableSkeleton rows={6} />
        ) : employees.length === 0 ? (
          <div className="rounded-cell border border-border bg-white p-12 text-center text-text-secondary">
            {t("empty")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-cell border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-page-bg text-text-secondary">
                  <th className="px-4 py-3 text-start font-medium">{t("code")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("phone")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("type")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                  <th className="px-4 py-3 text-start font-medium">{tc("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-border last:border-0">
                    <td className="tabular-nums px-4 py-3">{emp.employee_code}</td>
                    <td className="px-4 py-3 font-medium">{emp.name}</td>
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                      {emp.phone}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={emp.type === "OFFICE" ? "office" : "field"}>
                        {emp.type === "OFFICE" ? tc("office") : tc("field")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={emp.is_active ? "active" : "inactive"}>
                        {emp.is_active ? tc("active") : tc("inactive")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(emp);
                            setModalOpen(true);
                          }}
                        >
                          {tc("edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(emp)}
                        >
                          {emp.is_active ? t("deactivate") : t("activate")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(emp)}
                        >
                          {tc("delete")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? t("editEmployee") : t("addEmployee")}
        size="lg"
      >
        <EmployeeForm
          key={editing?.id ?? "new"}
          employee={editing}
          onSaved={handleSaved}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      </Modal>
    </>
  );
}

export default EmployeesPageClient;
