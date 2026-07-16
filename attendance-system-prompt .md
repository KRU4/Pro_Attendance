# Build Prompt: WhatsApp-Based Attendance & Checkout System

## Context
Build a full-stack web application that serves as the backend/dashboard for a WhatsApp-based attendance tracking system. An external n8n workflow (already built, not part of this project) sends HTTP POST requests to this website whenever an employee sends a WhatsApp message like "حضور" (check-in) or "انصراف" (check-out). This website owns ALL business logic and is the single source of truth — n8n never talks to the database directly.

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL as the database
- Prisma as the ORM
- Arabic-first UI, full RTL layout, Cairo or Tajawal font
- Deployed via Docker (include a Dockerfile and docker-compose.yml with a postgres service)

## Visual Identity
Reference the attached brand style (Pro Group): primary red/crimson accent color, clean white backgrounds, simple top navigation. But the main attendance grid should stay mostly white/neutral with gray gridlines — only the status colors (green/red/gray/yellow) should stand out. Header bar uses the brand red.

---

## Database Schema (Prisma)

### Employee
- id (autoincrement int, this is the "employee code" shared with the employee — call it `employee_code` and make it human-friendly/short, e.g. sequential starting at 1001)
- name (string)
- phone (string, unique — this is the real identifier, normalized to a consistent format e.g. +20XXXXXXXXXX)
- type (enum: OFFICE | FIELD)
- allow_checkout_input (boolean, default true for FIELD, false for OFFICE) — whether the AI/workflow is allowed to accept a check-out message for this employee
- default_checkout_time (string/time, nullable — used for OFFICE employees, e.g. "18:00")
- required_days_per_month (int, nullable) — for FIELD employees' target
- required_hours_per_month (int, nullable) — for FIELD employees' target
- is_active (boolean, default true)
- created_at, updated_at

### EmployeeWeeklyOff
- id
- employee_id (FK)
- day_of_week (int 0-6, 0=Sunday matching JS convention, but confirm Friday/Saturday are the common off days in Egypt)

### CompanyHoliday
- id
- date
- label (string, e.g. "عيد الأضحى")
- applies to ALL employees (company-wide, not per-employee)

### AttendanceRecord
- id
- employee_id (FK)
- date (date only, no time)
- status (enum: PRESENT | ABSENT | HOLIDAY | INCOMPLETE) — computed/stored field
- check_in_time (datetime, nullable)
- check_in_location (string, nullable)
- check_out_time (datetime, nullable)
- check_out_location (string, nullable)
- note (text, nullable) — free text, holds extra context (location text, late arrival explanation, duplicate check-in attempts appended as timestamped lines, manual edit reasons like "مريض")
- is_manual_override (boolean, default false) — true if last touched by a dashboard user rather than the webhook
- edited_by (string, nullable) — name/id of the accounts staff member who last edited
- edited_at (datetime, nullable)
- created_at, updated_at
- UNIQUE constraint on (employee_id, date)

### AttendanceHistory (audit trail)
- id
- attendance_record_id (FK)
- changed_by (string)
- changed_at (datetime)
- old_value (JSON)
- new_value (JSON)

### ApiToken (for authenticating n8n requests)
- id
- token (string, hashed)
- label (string, e.g. "n8n production")
- is_active (boolean)
- created_at

---

## Core Business Logic (must live ONLY in this backend, never duplicated elsewhere)

1. **Identity resolution**: incoming requests carry both a phone number and an employee_code guess (the AI on the n8n side extracts this from free text, may contain typos). This backend must:
   - First try exact match on phone number.
   - If no employee is linked to that phone yet, try to match employee_code (allow fuzzy matching — e.g. Levenshtein distance ≤1 or ≤2 against existing codes) combined with the phone number to auto-link them for future messages.
   - If a phone number is already linked to a different employee_code than the one in the message, reject with a clear "phone mismatch" error — this prevents one employee from checking in on behalf of another using their code.
   - If no match at all, return `not_found`.

2. **Weekly off / Holiday awareness**: before creating an attendance record, check if this date is a weekly off day for this employee OR a company holiday. If so:
   - If no check-in message arrives, the day renders as gray (HOLIDAY) with no DB row needed (computed on the fly when rendering the grid).
   - If a check-in message DOES arrive on a day that would otherwise be a day off, still create the AttendanceRecord with status HOLIDAY, but flag it (e.g. `note` must be filled, and the grid should render this cell as gray with a pulsing indicator dot) — this requires a manual decision by accounts staff via the dashboard on whether to count it as PRESENT instead.

3. **Duplicate check-in handling**: if a check-in already exists for this employee+date, do NOT overwrite check_in_time. Instead append a new line to `note` with the new attempt's timestamp (e.g. "محاولة حضور إضافية الساعة 11:15").

4. **Check-out permission**: if `allow_checkout_input` is false for this employee, any check-out message should be ignored/rejected by the API (return a clear response so n8n can reply appropriately) — these employees' checkout is implicitly `default_checkout_time`, not written into check_out_time explicitly (or you may auto-write it — decide and document your choice in code comments).

5. **Incomplete status**: a FIELD employee with a check_in_time but no check_out_time by end of day should be marked INCOMPLETE, not counted in hour totals, and rendered yellow. Build a daily cron/scheduled job (e.g. via a Next.js API route triggered by an external cron, or `node-cron` inside the app) that runs after midnight and marks any day with only a check-in as INCOMPLETE, and any working day (not weekly-off/holiday) with no record at all as ABSENT.

6. **Hours calculation**: only for FIELD employees, only for days where both check_in_time and check_out_time exist. `hours = check_out_time - check_in_time`. Sum across the month for the summary table.

7. **All incoming timestamps arrive already converted to Africa/Cairo timezone by the n8n workflow** — do not attempt timezone conversion on this backend, just store as-is (but store as UTC internally per Prisma/Postgres convention, converting only for display — standard practice, don't skip this).

---

## API Endpoints (for n8n integration)

### `POST /api/attendance/check`
Auth: Bearer token (validated against ApiToken table).

Request body:
```json
{
  "phone": "+201001234567",
  "employee_code_guess": "1032",
  "action": "check_in",
  "timestamp": "2026-07-13T09:03:00+02:00",
  "location": "فرع مدينتي",
  "note": "جه متأخر شوية",
  "raw_message": "حضور فرع مدينتي"
}
```

Response (success):
```json
{ "status": "success", "employee_name": "...", "message": "تم تسجيل حضورك الساعة 9:03 صباحًا" }
```

Response (failure cases — each needs a distinct status so n8n can craft the right WhatsApp reply):
```json
{ "status": "not_found" }
{ "status": "phone_mismatch" }
{ "status": "checkout_not_allowed" }
{ "status": "already_checked_out" }
```

### `GET /api/employees/lookup?phone=...`
Optional helper endpoint if you want lookup logic exposed separately. Returns employee basic info or 404.

---

## Dashboards (internal, authenticated — build simple email/password auth for accounts staff, no need for complex roles unless you want a simple ADMIN/VIEWER distinction)

### 1. Employee Management
- Table/list of all employees with search and filter by type (OFFICE/FIELD) and active status
- Create/edit form: name, phone, type, allow_checkout_input toggle, default_checkout_time, required_days_per_month, required_hours_per_month, weekly off days (multi-select of days), active toggle
- Deactivate instead of hard delete

### 2. Attendance Grid + Report (combine into one page with two tabs)

**Tab: Grid**
- Month/year picker
- Rows = employees (searchable/filterable by type), Columns = days of the month
- Each cell colored: green (present), red (absent), gray (holiday/weekly-off), yellow (incomplete)
- Cell with data on a gray day shows a small pulsing dot indicator
- Every cell is clickable, opens a modal to manually edit: status, check_in_time, check_out_time (only if allow_checkout_input), note (required for any non-present status or any override), saves with edited_by/edited_at and writes an AttendanceHistory entry
- Locking: add a "close month" action that marks all records in that month read-only (still viewable, edits blocked) — this should be a deliberate action per month, not automatic

**Tab: Report / Summary**
- One row per employee for the selected month
- OFFICE employees: name, present days, total working days (month days minus weekly-off minus holidays), absent days
- FIELD employees: name, present days, total working days, absent days, total hours worked, required hours/days, difference (over/under)
- Export buttons: "Export All" (whole grid + summary as Excel), "Export Selected Employee" (single employee's month, formatted for handing to them), "Export by Type" (OFFICE only / FIELD only)
- Use a library like `exceljs` or `xlsx` for the Excel export, generate proper Arabic RTL formatted sheets with the color coding preserved if possible

---

## Non-functional requirements
- All UI text in Egyptian Arabic dialect where natural (not too formal), RTL layout throughout
- Mobile-responsive dashboard (accounts staff may check from phone)
- Proper error handling and loading states everywhere
- Seed script with a few sample employees (mix of OFFICE/FIELD) and a sample month of attendance data for testing
- README documenting the two API endpoints clearly, since another team (n8n workflow owner) needs to integrate against them independently

---

## Build order (suggested)
1. Prisma schema + migrations + seed data
2. Auth for dashboard (simple)
3. Employee Management CRUD
4. `/api/attendance/check` endpoint with full business logic + token auth
5. Attendance Grid (read-only first, rendering colors correctly including weekly-off/holiday logic)
6. Manual edit modal + AttendanceHistory
7. Summary/Report tab with calculations
8. Export functionality (all 3 variants)
9. Month locking
10. Cron job for auto-marking ABSENT/INCOMPLETE
