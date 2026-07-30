"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GridCell } from "./AttendanceGrid";

type Status = "PRESENT" | "ABSENT" | "HOLIDAY" | "INCOMPLETE";

interface Props {
  open: boolean;
  onClose: () => void;
  employeeId: number;
  employeeName: string;
  cell: GridCell | null;
  allowCheckout: boolean;
  onSaved: () => void;
}

export function AttendanceEditModal({
  open,
  onClose,
  employeeId,
  employeeName,
  cell,
  allowCheckout,
  onSaved,
}: Props) {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");
  const tv = useTranslations("common.validation");

  const [status, setStatus] = useState<Status>(cell?.status ?? "ABSENT");
  const [checkIn, setCheckIn] = useState(cell?.checkInTimeInput ?? "");
  const [checkOut, setCheckOut] = useState(cell?.checkOutTimeInput ?? "");
  const [note, setNote] = useState(cell?.note ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (cell) {
      setStatus(cell.status ?? "ABSENT");
      setCheckIn(cell.checkInTimeInput ?? "");
      setCheckOut(cell.checkOutTimeInput ?? "");
      setNote(cell.note ?? "");
      setError("");
    }
  }, [cell]);

  if (!cell) return null;

  const noteRequired = status !== "PRESENT";

  const handleSave = async () => {
    if (noteRequired && !note.trim()) {
      setError(tv("noteRequired"));
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/attendance/record", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: employeeId,
        date: cell.date,
        status,
        check_in_time: checkIn || null,
        check_out_time: allowCheckout ? checkOut || null : null,
        note: note || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error === "note_required" ? tv("noteRequired") : tc("error"));
      setLoading(false);
      return;
    }

    setLoading(false);
    onSaved();
    onClose();
  };

  const handleClear = async () => {
    if (!window.confirm(t("clearConfirm"))) return;
    setClearing(true);
    setError("");

    const res = await fetch(
      `/api/attendance/record?employeeId=${employeeId}&date=${cell.date}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      setError(tc("error"));
      setClearing(false);
      return;
    }

    setClearing(false);
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("editRecord")}
      footer={
        <>
          <Button
            variant="secondary"
            className="text-red-600 hover:bg-red-50 me-auto"
            onClick={handleClear}
            disabled={clearing || loading}
          >
            {t("clear")}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {tc("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          {employeeName} — {cell.date}
        </p>
        <Select
          label={t("status")}
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          options={[
            { value: "PRESENT", label: tc("status.PRESENT") },
            { value: "ABSENT", label: tc("status.ABSENT") },
            { value: "HOLIDAY", label: tc("status.HOLIDAY") },
            { value: "INCOMPLETE", label: tc("status.INCOMPLETE") },
          ]}
        />
        <Input
          label={t("checkIn")}
          type="time"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
        />
        {allowCheckout && (
          <Input
            label={t("checkOut")}
            type="time"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t("note")}
            {noteRequired && <span className="text-status-absent ms-1">*</span>}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={3}
            className={`w-full rounded-cell border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              noteRequired && !note.trim() ? "border-status-absent" : "border-border"
            }`}
          />
        </div>
        {error && <p className="text-sm text-status-absent">{error}</p>}
      </div>
    </Modal>
  );
}
