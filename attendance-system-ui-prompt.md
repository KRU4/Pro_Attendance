# Build Prompt: UI Structure, Pages & Bilingual Support (AR/EN)

## Context
This prompt covers the actual UI screens, components, and navigation structure for the attendance dashboard. It must be built bilingual from day one: Arabic (RTL) and English (LTR), with a language switcher. Arabic is the default/primary language for this team, English is secondary but must be fully functional, not an afterthought.

## Internationalization (i18n) Setup
- Use `next-intl` (or `next-i18next` if preferred) for routing and translation management — do not hardcode any UI string directly in components
- Locale-based routing: `/ar/...` and `/en/...`, with `/ar` as the default redirect from `/`
- Store all UI strings in structured JSON translation files: `messages/ar.json` and `messages/en.json`, organized by feature (e.g. `employees.*`, `attendance.*`, `reports.*`, `common.*`)
- Persist the user's language choice (cookie or localStorage) so it's remembered across sessions
- `<html dir="rtl" lang="ar">` when Arabic is active, `<html dir="ltr" lang="en">` when English is active — set this dynamically at the root layout level, not per-component
- Tailwind: use logical properties (`ms-`, `me-`, `ps-`, `pe-` instead of `ml-`, `mr-`, `pl-`, `pr-`) throughout so spacing auto-flips between RTL and LTR without duplicate style code
- Numbers and dates: Arabic locale should still display using Western/Arabic numerals consistently (avoid mixing Eastern Arabic numerals ٠١٢ with Western 012 — pick Western numerals for both locales to prevent alignment/parsing bugs in tables), but format dates using the appropriate locale conventions (e.g. day/month order, month names translated)
- Language switcher: a simple toggle in the header/sidebar (AR | EN or a globe icon + dropdown), switches locale while preserving the current page/filters/state

## Global Layout
- **Sidebar** (flips side automatically based on direction: right side in RTL, left side in LTR): links to Dashboard/Home, Employees, Attendance Grid, Reports, Settings
- **Header bar**: page title (translated), language switcher, logged-in user name + logout
- **Breadcrumbs** on nested pages (e.g. Employees > Edit Employee)

## Pages & Components

### 1. Login Page
- Simple centered card: email + password fields, submit button, error state for invalid credentials
- Language switcher available even before login

### 2. Dashboard / Home
- Quick summary cards: total active employees, today's check-ins so far, number of INCOMPLETE records needing review, number of employees currently on leave/holiday today
- A "needs attention" list: today's INCOMPLETE records and any HOLIDAY-day records awaiting a manual present/absent decision, each linking directly to that cell's edit modal

### 3. Employees Page
- **List view**: table with columns — code, name, phone, type (badge: office/field), status (active/inactive), quick actions (edit/deactivate)
- Search bar (name/phone/code) + filter chips (type, active status)
- **Create/Edit form** (modal or dedicated page, your choice — but keep create and edit using the same form component):
  - Name, phone (with format validation), type (radio: office/field)
  - Toggle: "Allow AI to record check-out for this employee" (allow_checkout_input)
  - Conditional field: default check-out time (only shown/relevant if type = office)
  - Conditional fields: required days/month, required hours/month (only shown if type = field)
  - Weekly off days: a 7-day picker (checkboxes for Sun–Sat, labeled in the active language), Friday/Saturday pre-checked as sensible Egypt default but fully editable
  - Active/inactive toggle

### 4. Attendance Grid Page
- Month/year selector (prev/next arrows + dropdown), employee type filter, search box
- The grid itself: sticky employee-name column, scrollable day columns, sticky header row with day numbers + weekday initials, subtle column tint for weekend/holiday columns
- Each cell: colored per status, shows check-in time as small text if present, small corner mark if a note exists
- Click any cell → opens the edit modal (status dropdown, check-in/out time pickers, note textarea, save/cancel), pre-filled with existing data
- "Close month" button (with confirmation dialog) near the month selector, visibly disables editing once a month is closed (locked banner shown across the grid)

### 5. Reports Page
- Same month/year + type filter controls as the grid page (keep them visually consistent/shared component)
- Summary table: employee name, present days, total working days, absent days, and (for field employees only) total hours + required hours + difference (colored text: green if meeting target, red/amber if short)
- Three export buttons: "Export All", "Export Selected" (only enabled once a row/employee is selected via checkbox or click), "Export by Type" (dropdown: office/field)
- Exported Excel file content should also respect the active UI language (column headers translated)

### 6. Settings Page
- Company holidays list: add/remove holiday dates + labels (this list is company-wide, applies to all employees)
- API token management: view/regenerate the token used by the n8n integration (masked by default, reveal on click, copy button)

## Component Library / Conventions
- Build a small internal component set (Button, Input, Select, Modal, Badge, Toast/notification, Table) rather than importing a full heavy UI kit — keep it lightweight and consistent with the token system from the design prompt
- All form validation errors and toast/notification messages must go through the translation system too — no hardcoded strings even for errors
- Loading states: skeleton placeholders for the grid and tables (not spinners) since layout shift on a data-dense grid is jarring
- Every page must render correctly and remain usable when switching language mid-session without a full page reload breaking state

## Deliverable Notes
- Include a short section in the README explaining how to add a new translation key (for future maintainers who may not touch i18n config often)
- Seed both `ar.json` and `en.json` with complete translations for every string used — do not leave English as a partial/placeholder translation
