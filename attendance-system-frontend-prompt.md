# Build Prompt: Frontend Design & Visual System

## Context
This is the frontend design direction for an internal attendance-tracking dashboard (Arabic RTL, used daily by accounts staff). It is NOT a marketing site — it's a dense, functional data tool used every day. Prioritize clarity and scan-speed over decoration. Reference: the company (Pro Group) brand uses red as its primary identity color, seen on progroupeg.com (red header bar, white background, clean simple nav).

## Design Principle: Separate "Brand Color" from "Data Color"
This is the single most important rule for this build. The brand's red must NOT be reused as the "absent" status color in the attendance grid — doing so creates visual conflict between identity elements (header, buttons, logo) and data elements (grid cells), making the interface feel noisy and harder to scan. Brand red is reserved for chrome/navigation/actions only. The grid's status colors are a separate, deliberately chosen palette.

## Token System

**Colors:**
- Brand red (chrome only — header, sidebar, primary buttons, active nav state): `#C41E2A`
- Background: `#FAFAFA` (page), `#FFFFFF` (cards/grid surface)
- Text primary: `#1A1A1A`
- Text secondary: `#6B7280`
- Border/gridlines: `#E5E7EB`

**Status colors (grid cells only, distinct from brand red):**
- Present: `#2F9E58` (calm green)
- Absent: `#D64545` (softer, more muted red than the brand red — visibly a different shade so the two reds are never confused)
- Holiday / weekly-off: `#C7C9CC` (neutral gray)
- Incomplete: `#E8A93B` (amber)
- Manual-override indicator dot: pulses between the cell's base color and white, `2s ease-in-out infinite`, respecting `prefers-reduced-motion` (static ring instead if reduced motion is on)

**Typography:**
- Data/table/body text: IBM Plex Sans Arabic or Cairo — must stay highly legible at small sizes (12–13px) since the grid is dense
- Headers/page titles: Tajawal (semi-bold/bold weights), slightly more character than the body face without sacrificing clarity
- Use tabular/monospaced number rendering for the hours and day counts in the summary table so columns align visually

**Layout:**
- Right-side (RTL-correct) fixed sidebar in brand red for primary navigation: لوحة التحكم / الموظفين / الحضور والانصراف / التقارير
- Main content area: white, generous padding, sticky table header/day-row when scrolling a large grid horizontally
- Grid cells: fixed small square/rectangle size, rounded corners (4px, not fully rounded — this is a data tool, not a playful app), subtle hover state (slight border darken) to indicate clickability without being showy

## Signature Element
The pulsing dot indicator (used when an employee has a recorded check-in on what should be a day off) is the one deliberate, memorable visual moment in this system. Keep everything else quiet and restrained around it — no extra gradients, no decorative icons, no unnecessary shadows. This is the detail that should make the tool feel considered rather than templated.

## Component-Specific Notes

**Attendance grid:**
- Each cell shows: background color (status) + small time text if present (e.g. "9:03") + note icon (small dot or corner mark) if a note exists, revealed as tooltip/hover, not always-visible text (avoid clutter)
- Employee name column frozen/sticky on the right (RTL) while scrolling horizontally through days
- Weekend/holiday columns can have a very subtle background tint on the whole column (not just per-cell) so the eye catches the pattern of the week at a glance

**Modal (manual edit):**
- Keep it minimal: status dropdown, time pickers (only show check-out picker if applicable to that employee), note textarea, save/cancel
- Note field should visibly indicate when it's required (e.g. red asterisk + border highlight) vs optional

**Summary/report table:**
- Use color only for the "difference" column (required vs actual hours/days): green text if meeting/exceeding target, red/amber text if under — do not repeat full cell-background coloring here, this table needs a calmer, more report-like tone than the grid

**Empty/error states:**
- Write these in plain, direct Arabic, describing what happened and what to do next — no generic "حدث خطأ ما", be specific (e.g. "لا يوجد موظفين مسجلين بعد. ابدأ بإضافة موظف من هنا")

## Accessibility & Quality Floor
- Visible keyboard focus states on every interactive element
- Grid must remain usable (horizontally scrollable, not broken) down to tablet width; full mobile support for the grid itself is not required, but the Employee Management and Report tabs must be mobile-responsive
- Respect `prefers-reduced-motion` for the pulsing dot and any transitions
- Color is never the only signal — pair status colors with a text label (visible on hover/tap, e.g. via `aria-label` or tooltip) for colorblind accessibility

## What to avoid
- Do not default to a generic dashboard template look (sidebar icons + cards + shadow-heavy widgets) without deliberate choices — every color and spacing decision should trace back to this token system
- Do not use gradients or decorative illustrations — this is a utility tool
- Do not make the grid playful/rounded (no pill-shaped cells, no bouncy animations) — the tone is precise and calm, not consumer-app friendly
