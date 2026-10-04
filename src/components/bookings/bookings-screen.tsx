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
import { PlannedActual } from "@/components/common/money";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconChip, type IconTone } from "@/components/ui/icon-chip";
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
  const toBook = views.filter((v) => v.status === "need_to_book" && v.date >= today);
  const upcoming = filtered.filter((v) => (v.endDate ?? v.date) >= today && !(tab === "all" && toBook.includes(v)));
  const past = filtered.filter((v) => (v.endDate ?? v.date) < today);
  const deadlines = upcomingDeadlines(views, today);
  const toPay = views.filter((v) => v.status !== "cancelled").reduce((a, v) => a + v.balance, 0);
  const workation = trip.workSchedule.enabled && trip.workSchedule.showWorkspaceStays;

  const setTab = (t: string) => router.replace(t === "all" ? "/bookings" : `/bookings?tab=${t}`, { scroll: false });

  const addForTab = () => {
    if (tab === "stay") sheets.open({ type: "accommodation" });
    else if (tab === "transport") sheets.open({ type: "transport" });
    else sheets.open({ type: "booking" });
  };

  return (
    <div>
      <PageHeader
        title="Bookings"
        description={`${plural(views.filter((v) => v.status !== "cancelled").length, "booking")} · ${money(toPay, trip.currency)} still to pay`}
        actions={
          <Button size="sm" variant="outline" onClick={addForTab} aria-label="Add booking">
            <Plus /> <span className="hidden sm:inline">Add booking</span>
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="transport">Transport</TabsTrigger>
              <TabsTrigger value="stay">Stays</TabsTrigger>
              <TabsTrigger value="activity">Activities</TabsTrigger>
            </TabsList>
          </Tabs>

          {toBook.length > 0 && tab === "all" && (
            <section className="mt-6">
              <SectionHeading title="Still to book" count={toBook.length} className="mb-3" />
              <ul className="card divide-y">
                {toBook.map((v) => (
                  <BookingRow key={v.key} v={v} currency={trip.currency} today={today} workation={workation} />
                ))}
              </ul>
            </section>
          )}

          {filtered.length === 0 ? (
            <div className="card mt-6">
              <EmptyState
                icon={tab === "stay" ? Bed : tab === "transport" ? Route : Ticket}
                title={tab === "transport" ? "No transport yet" : tab === "stay" ? "No stays yet" : "Nothing booked yet"}
                description="Add bookings to keep status, payments and deadlines in one place."
                action={<Button onClick={addForTab}>Add booking</Button>}
              />
            </div>
          ) : (
            <>
              <section className="mt-6">
                <SectionHeading title="Upcoming" count={upcoming.length} className="mb-3" />
                {upcoming.length ? (
                  <ul className="card divide-y">
                    {upcoming.map((v) => (
                      <BookingRow key={v.key} v={v} currency={trip.currency} today={today} workation={workation} />
                    ))}
                  </ul>
                ) : (
                  <p className="card px-4 py-4 text-[14px] text-muted-foreground">Nothing upcoming here.</p>
                )}
              </section>
              {past.length > 0 && (
                <section className="mt-8">
                  <SectionHeading title="Past" count={past.length} className="mb-3" />
                  <ul className="card divide-y opacity-80">
                    {past.map((v) => (
                      <BookingRow key={v.key} v={v} currency={trip.currency} today={today} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <aside className="grid min-w-0 grid-cols-1 content-start gap-8">
          <section>
            <SectionHeading title="Deadlines" count={deadlines.length || undefined} className="mb-3" />
            {deadlines.length === 0 ? (
              <p className="card px-4 py-4 text-[14px] text-muted-foreground">No deadlines — everything upcoming is confirmed.</p>
            ) : (
              <ol className="card divide-y">
                {deadlines.map((d) => (
                  <li key={d.key} className="flex items-center gap-4 px-4 py-3.5 lg:px-5">
                    <div className={cn("w-10 shrink-0 text-center", d.daysLeft <= 3 ? "text-danger" : "text-foreground")}>
                      <p className="text-[20px] font-semibold leading-none tabular">{Math.max(0, d.daysLeft)}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{d.daysLeft === 1 ? "day" : "days"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium leading-snug">{d.label}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {money(d.view.price, trip.currency)}
                        {d.view.estimated ? " est." : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section>
            <SectionHeading title="Payments" className="mb-3" />
            <dl className="card divide-y text-[15px]">
              {(["paid", "partial", "unpaid"] as const).map((s) => {
                const list = views.filter((v) => v.paymentStatus === s && v.status !== "cancelled");
                return (
                  <div key={s} className="flex justify-between gap-3 px-4 py-3 lg:px-5">
                    <dt className="text-muted-foreground">
                      {PAYMENT_LABEL[s]} <span className="tabular">· {list.length}</span>
                    </dt>
                    <dd className="font-medium tabular">
                      {money(list.reduce((a, v) => a + (s === "paid" ? v.paid : v.balance), 0), trip.currency)}
                      {s !== "paid" ? <span className="font-normal text-muted-foreground"> due</span> : ""}
                    </dd>
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

function BookingRow({ v, currency, today, workation }: { v: BookingView; currency: CurrencyCode; today: string; workation?: boolean }) {
  const sheets = useSheets();
  const router = useRouter();
  const data = useData();
  const trip = useActiveTrip()!;
  const Icon = v.source === "decision" ? Route : KIND_ICON[v.kind];
  const stay = v.source === "accommodation" ? data.accommodations.find((a) => a.id === v.sourceId) : undefined;
  const tone: IconTone = v.status === "need_to_book" ? "warning" : v.status === "cancelled" ? "danger" : "neutral";

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
    toast.success(`${money(v.balance, currency)} recorded in Budget`);
  };

  const when = v.source === "event"
    ? relativeDayLabel(v.date, today) !== fmtDayMonth(v.date) ? relativeDayLabel(v.date, today) : ""
    : v.endDate
    ? fmtRange(v.date, v.endDate)
    : relativeDayLabel(v.date, today) === fmtDayMonth(v.date)
      ? fmtDayMonth(v.date)
      : `${relativeDayLabel(v.date, today)} · ${fmtDayMonth(v.date)}`;

  return (
    <li className="flex items-start">
      <button type="button" onClick={open} className="flex min-w-0 flex-1 items-start gap-3 py-3.5 pl-4 text-left lg:pl-5">
        <IconChip icon={Icon} tone={tone} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-tight">{v.title}</span>
          <span className="block truncate text-[13px] text-muted-foreground">
            {[when, v.subtitle].filter(Boolean).join(" · ")}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <Badge tone={STATUS_TONE[v.status]}>
              {v.status === "confirmed" ? <Check /> : v.status === "need_to_book" ? <CalendarClock /> : v.status === "cancelled" ? <X /> : <CircleDashed />}
              {v.source === "decision" ? "Not decided" : STATUS_LABEL[v.status]}
            </Badge>
            {v.price > 0 && (
              <PlannedActual planned={v.price} actual={v.paid} currency={currency} plannedLabel={v.estimated ? "From" : "Planned"} />
            )}
          </span>
          {stay && workation && (
            <span className="mt-1.5 flex flex-wrap gap-x-3 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1">
                {stay.wifi?.available ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
                {stay.wifi?.available ? (stay.wifi.speedMbps ? `${stay.wifi.speedMbps} Mbps` : "Wi-Fi") : "No Wi-Fi info"}
              </span>
              <span className="flex items-center gap-1">
                <Laptop className="size-3.5" /> {stay.workspace ? "Workspace" : "No desk"}
              </span>
            </span>
          )}
          {v.reference && <span className="mt-1 block truncate text-[12px] text-subtle-foreground">Ref {v.reference}</span>}
        </span>
      </button>
      <div className="flex shrink-0 items-start px-2 pt-3">
        {v.source === "decision" ? (
          <Button variant="ghost" size="sm" onClick={open} className="text-accent-foreground">
            <Scale /> Compare
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" aria-label={`Actions for ${v.title}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {v.status !== "confirmed" && (
                <DropdownMenuItem onSelect={() => status("confirmed")}>
                  <Check /> Mark booked
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
