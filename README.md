# Waypoint — a travel operating system

> Know where you are, what happens today, what happens next, and how much money you have left.

Waypoint is a mobile-first web app for long backpacking trips, workations and multi-purpose travel. It ships with a realistic demo trip — **Kerala Backpacking + Jaipur Exams** (29 Nov – 27 Dec) — narrated from Friday 4 December in Munnar.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Node 20+. No API keys or external services are required.

The demo opens “as” 4 Dec 2026 so Today has something to show. Switch to the real date in **Settings → Date**.

## Stack

Next.js 16 (App Router, static) · TypeScript · Tailwind CSS v4 · shadcn/ui-style components on Radix · vaul bottom sheets · Lucide · Geist Sans/Mono · zustand · zod · dnd-kit · sonner.

## What's in it

| Area | Highlights |
| --- | --- |
| **Today** | Greeting, route, Day X of Y, location, phase, typical weather · vertical timeline with protected work block, live “now” line, “free after work” hint · Next up · budget + today’s spend · deterministic alerts (checkout→departure gap, work overlaps, unbooked stays, undecided transport, nights without a stay, under/over today’s budget) · prev/next day |
| **Trip** | Phases drawn to scale with spend vs. budget · Timeline (every day, phase dividers, transfers, work/day-off chips, add/edit/delete, drag-to-reorder flexible items on desktop, up/down on mobile) · Calendar (subtle markers, click a day to see its timeline) · Map (offline projected route sketch + editable, reorderable destination list) |
| **Workation** | Work days/hours, protect hours, prefer transport outside work, Wi-Fi + workspace emphasis, per-date days off · live overlap warning (“overlaps 3h 20m”) with *Change time* / *Keep anyway* — never blocking |
| **Money** | Budget hero, safe daily spend (remaining ÷ remaining days) and the after-bookings figure · today’s list vs. target · daily spend chart against the safe line (with table view) · planned/actual/remaining per category with committed bookings · editable/custom categories · insights (pace vs. plan, fixed categories after bookings, projection, 3-day trend, phase totals) · searchable, filterable expense list · fast quick-add with receipt placeholder and undo |
| **Transport decisions** | Compare any number of multi-leg options with hidden costs · cheapest / fastest / best value · Save money / Balanced / Save time weights with a visible score breakdown · extra cost, time saved, cost per hour saved · choose → becomes a “Need to book” journey on the timeline |
| **Bookings** | One list across stays, transport, activities and misc · status + payment status · missing items, deadlines, payments summary · quick actions (confirm, pending, need to book, mark paid, cancel) |
| **Checklist** | Sections, quantity, notes, need-to-buy with estimated cost, optionally reserved in the budget · “bought” logs a Shopping expense · progress, filters, quick add, reusable templates |
| **Onboarding** | 6 steps (where, when, why, budget, work, create); everything but dates is skippable |
| **Settings** | Name, trip basics, work schedule, exams, simulated date, theme, export/import JSON, reset demo, delete all |

## Architecture

```
src/
  app/                    routes (all static, client-rendered data)
  components/
    ui/                   primitives (button, inputs, sheet, dialog, tabs, …)
    shell/                sidebar, bottom nav, headers, app shell states
    forms/                sheets for every entity + the Add menu provider
    timeline/             shared day timeline (Today, Trip, Calendar)
    today/ trip/ money/ transport/ bookings/ checklist/ settings/ onboarding/
  lib/
    types.ts              domain model (User, Trip, TripPhase, Destination, TimelineEvent,
                          WorkSchedule, Expense, Budget(Category), Transport(Option/Decision),
                          Accommodation, Booking, Checklist(Item), Exam, …)
    calc/                 pure, deterministic calculations — dates, trip, work, budget,
                          bookings, transport/decision engine, timeline, alerts, checklist
    data/                 repository interface, localStorage implementation, migrations,
                          defaults and the demo trip
    store/                zustand store (in-memory state + change log) and domain actions
```

**Persistence.** Screens never touch storage. Domain actions emit `Change` records (`upsert` / `delete` per collection) to a `Repository`. `LocalStorageRepository` snapshots the whole document (debounced). A Supabase/Postgres repository can implement the same `load()` / `commit(changes)` interface by mapping each collection to a table — no UI changes needed.

**Money consistency.** Bookings don’t store “amount paid”. Payments are expenses linked to the booking, so Money and Bookings can never disagree. Editing “amount paid” on a booking adds or trims linked expenses.

**Maps & weather** are provider interfaces with offline defaults (projected SVG route; typical monthly climate, clearly labelled). Add a real provider without changing callers.

**PWA.** Web manifest, maskable icons, Apple touch icon, and an offline-first service worker (registered in production).
