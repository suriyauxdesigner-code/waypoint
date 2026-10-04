"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Bed, CalendarClock, Check, CircleDashed, Laptop, MoreHorizontal, Pencil, Plus, Route, Ticket, TrainFront, Wifi, WifiOff, X, Scale, Wallet } from "lucide-react";
import { useActiveTrip, useData, useMoney, useToday } from "@/lib/store/hooks";
import { PAYMENT_LABEL, STATUS_LABEL, upcomingDeadlines, type BookingView } from "@/lib/calc/bookings";
import { fmtDayMonth, fmtRange, relativeDayLabel } from "@/lib/calc/dates";
import { money, plural } from "@/lib/format";
import { setBookingStatus, syncPayment } from "@/lib/store/actions";
import { PageHeader } from "@/components/shell/page-header";
import { SectionHeading } from "@/components/common/section";
import { EmptyState } from "@/components/common/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSheets } from "@/components/forms/sheets-provider";
import type { BookingStatus, CurrencyCode } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "all" | "transport" | "stay" | "activity";

const KIND_ICON = { transport: TrainFront, stay: Bed, activity: Ticket, other: Ticket };

const STATUS_TONE: Record<BookingStatus, "positive" | "neutral" | "warning" | "danger"> = {
  confirmed: "positive",
  pending: "neutral",
  need_to_book: "warning",
  cancelled: "danger",
};

export function BookingsScreen() {
  const trip = useActiveTrip()!;
  const { today } = useToday();
  const m = useMoney(trip, today)!;
  const params = useSearchParams();
  const router = useRouter();
  const sheets = useSheets();
  const tab = (params.get("tab") as Tab) || "all";
  const views = m.bookings;
  const filtered = views.filter((v) => tab === "all" || v.kind === tab || (tab === "activity" && v.kind === "other"));
  const upcoming = filtered.filter((v) => (v.endDate ?? v.date) >= today);
  const past = filtered.filter((v) => (v.endDate ?? v.date) < today);
  const deadlines = upcomingDeadlines(views, today);
  const toBook = views.filter((v) => v.status === "need_to_book" && v.date >= today);
  const toPay = views.filter((v) => v.status !== "cancelled").reduce((a, v) => a + v.balance, 0);

  const setTab = (t: string) => router.replace(t === "all" ? "/bookings" : `/bookings?tab=${t}`, { scroll: false });

  const addForTab = () => {
    if (tab === "stay") sheets.open({ type: "accommodation" });
    else if (tab === "transport") sheets.open({ type: "transport" });
    else sheets.open({ type: "booking" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Bookings"
        title="Bookings"
        actions={
          <Button size="sm" variant="outline" onClick={addForTab}>
            <Plus /> <span className="hidden sm:inline">Add booking</span>
          </Button>
        }
      >
        <p className="mt-1 text-[13px] text-muted-foreground">
          {plural(views.filter((v) => v.status !== "cancelled").length, "booking")} · {toBook.length} to book · {money(toPay, trip.currency)} still to pay
        </p>
      </PageHeader>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="min-w-0">
          {toBook.length > 0 && tab === "all" && (
            <section className="mb-8">
              <SectionHeading title="Missing" count={toBook.length} className="mb-2" />
              <ul className="grid grid-cols-1 gap-2">
                {toBook.map((v) => (
                  <BookingRow key={v.key} v={v} currency={trip.currency} today={today} highlight workation={trip.workSchedule.enabled && trip.workSchedule.showWorkspaceStays} />
                ))}
              </ul>
            </section>
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="transport">Transport</TabsTrigger>
              <TabsTrigger value="stay">Stay</TabsTrigger>
              <TabsTrigger value="activity">Activities</TabsTrigger>
            </TabsList>
          </Tabs>

          {filtered.length === 0 ? (
            <EmptyState
              icon={tab === "stay" ? Bed : tab === "transport" ? Route : Ticket}
              title={tab === "transport" ? "No transport booked yet." : tab === "stay" ? "No stays added yet." : "Nothing booked yet."}
              description={tab === "transport" ? "Add your first route." : "Add bookings to track status, payments and deadlines in one place."}
              action={<Button onClick={addForTab}>Add</Button>}
            />
          ) : (
            <>
              <SectionHeading title="Upcoming" count={upcoming.length} className="mb-2 mt-6" />
              {upcoming.length ? (
                <ul className="divide-y rounded-xl border bg-surface">
                  {upcoming.map((v) => (
                    <BookingRow key={v.key} v={v} currency={trip.currency} today={today} flat workation={trip.workSchedule.enabled && trip.workSchedule.showWorkspaceStays} />
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted-foreground">Nothing upcoming in this view.</p>
              )}
              {past.length > 0 && (
                <>
                  <SectionHeading title="Past" count={past.length} className="mb-2 mt-8" />
                  <ul className="divide-y rounded-xl border bg-surface opacity-75">
                    {past.map((v) => (
                      <BookingRow key={v.key} v={v} currency={trip.currency} today={today} flat />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        <aside className="grid min-w-0 grid-cols-1 content-start gap-8">
          <section>
            <SectionHeading title="Upcoming deadlines" count={deadlines.length} className="mb-2" />
            {deadlines.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No deadlines. Everything upcoming is confirmed.</p>
            ) : (
              <ol className="grid grid-cols-1 gap-3">
                {deadlines.map((d) => (
                  <li key={d.key} className="flex gap-3">
                    <div className={cn("w-12 shrink-0 text-center", d.daysLeft <= 3 ? "text-danger" : "text-foreground")}>
                      <p className="text-[18px] font-semibold leading-none tabular">{Math.max(0, d.daysLeft)}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.daysLeft === 1 ? "day" : "days"}</p>
                    </div>
                    <div className="min-w-0 border-l pl-3">
                      <p className="text-[13px] font-medium leading-snug">{d.label}.</p>
                      <p className="text-[12px] text-muted-foreground">
                        {d.view.deadlineLabel ?? "Deadline"} {fmtDayMonth(d.date)} · {money(d.view.price, trip.currency)}
                        {d.view.estimated ? " est." : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section>
            <SectionHeading title="Payments" className="mb-2" />
            <dl className="grid grid-cols-1 gap-2 text-[13px]">
              {(["paid", "partial", "unpaid"] as const).map((s) => {
                const list = views.filter((v) => v.paymentStatus === s && v.status !== "cancelled");
                return (
                  <div key={s} className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {PAYMENT_LABEL[s]} <span className="tabular">({list.length})</span>
                    </dt>
                    <dd className="tabular">{money(list.reduce((a, v) => a + (s === "paid" ? v.paid : v.balance), 0), trip.currency)}{s !== "paid" ? " due" : ""}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function BookingRow({
  v,
  currency,
  today,
  highlight,
  flat,
  workation,
}: {
  v: BookingView;
  currency: CurrencyCode;
  today: string;
  highlight?: boolean;
  flat?: boolean;
  workation?: boolean;
}) {
  const sheets = useSheets();
  const router = useRouter();
  const data = useData();
  const trip = useActiveTrip()!;
  const Icon = v.source === "decision" ? Route : KIND_ICON[v.kind];
  const stay = v.source === "accommodation" ? data.accommodations.find((a) => a.id === v.sourceId) : undefined;

  const open = () => {
    switch (v.source) {
      case "accommodation":
        return sheets.open({ type: "accommodation", id: v.sourceId });
      case "transport":
        return sheets.open({ type: "transport", id: v.sourceId });
      case "event":
        return sheets.open({ type: "event", id: v.sourceId });
      case "booking":
        return sheets.open({ type: "booking", id: v.sourceId });
      case "decision":
        return router.push(`/trip/transport?id=${v.sourceId}`);
    }
  };

  const status = (s: BookingStatus) => {
    if (v.source === "decision") return;
    setBookingStatus(v.source, v.sourceId, s);
    toast.success(`Marked ${STATUS_LABEL[s].toLowerCase()}`);
  };

  const markPaid = () => {
    if (v.source === "decision") return;
    syncPayment(trip.id, v.source, v.sourceId, v.price, { label: v.title, date: today, location: v.location });
    toast.success(`${money(v.balance, currency)} recorded in Money`);
  };

  return (
    <li className={cn("flex items-stretch", !flat && "rounded-xl border bg-surface", highlight && "border-warning/40 bg-warning-soft/40")}>
      <button type="button" onClick={open} className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left">
        <span className="mt-0.5 grid size-8 shrink-0 place-content-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[14px] font-semibold tracking-tight">{v.title}</span>
            <span className="shrink-0 text-[14px] font-medium tabular">
              {v.estimated && <span className="text-[11px] font-normal text-muted-foreground">from </span>}
              {money(v.price, currency)}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
            {v.endDate ? fmtRange(v.date, v.endDate) : relativeDayLabel(v.date, today) === fmtDayMonth(v.date) ? fmtDayMonth(v.date) : `${fmtDayMonth(v.date)} · ${relativeDayLabel(v.date, today)}`}
            {v.subtitle ? ` · ${v.subtitle}` : ""}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[v.status]}>
              {v.status === "confirmed" ? <Check /> : v.status === "need_to_book" ? <CalendarClock /> : v.status === "cancelled" ? <X /> : <CircleDashed />}
              {v.source === "decision" ? "Not decided" : STATUS_LABEL[v.status]}
            </Badge>
            {v.source !== "decision" && v.price > 0 && (
              <Badge tone={v.paymentStatus === "paid" ? "outline" : "neutral"}>
                {PAYMENT_LABEL[v.paymentStatus]}
                {v.paymentStatus === "partial" ? ` · ${money(v.balance, currency)} due` : ""}
              </Badge>
            )}
            {stay && workation && (
              <>
                <Badge tone={stay.wifi?.available ? "info" : "warning"}>
                  {stay.wifi?.available ? <Wifi /> : <WifiOff />}
                  {stay.wifi?.available ? (stay.wifi.speedMbps ? `${stay.wifi.speedMbps} Mbps` : "Wi-Fi") : "No Wi-Fi info"}
                </Badge>
                <Badge tone={stay.workspace ? "info" : "neutral"}>
                  <Laptop /> {stay.workspace ? "Workspace" : "No desk"}
                </Badge>
              </>
            )}
            {v.reference && <span className="truncate text-[11px] text-subtle-foreground">{v.reference}</span>}
          </span>
        </span>
      </button>
      <div className="flex items-start pr-2 pt-2.5">
        {v.source === "decision" ? (
          <Button variant="ghost" size="sm" onClick={open}>
            <Scale /> Compare
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${v.title}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {v.status !== "confirmed" && (
                <DropdownMenuItem onSelect={() => status("confirmed")}>
                  <Check /> Mark confirmed
                </DropdownMenuItem>
              )}
              {v.status !== "pending" && (
                <DropdownMenuItem onSelect={() => status("pending")}>
                  <CircleDashed /> Mark pending
                </DropdownMenuItem>
              )}
              {v.status !== "need_to_book" && (
                <DropdownMenuItem onSelect={() => status("need_to_book")}>
                  <CalendarClock /> Need to book
                </DropdownMenuItem>
              )}
              {v.balance > 0 && (
                <DropdownMenuItem onSelect={markPaid}>
                  <Wallet /> Mark fully paid ({money(v.balance, currency)})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={open}>
                <Pencil /> Edit details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {v.status !== "cancelled" && (
                <DropdownMenuItem destructive onSelect={() => status("cancelled")}>
                  <X /> Cancel booking
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}
