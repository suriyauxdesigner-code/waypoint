"use client";

/* dnd-kit returns ref-backed props from useSortable; the React Compiler lint flags them as a false positive. */
/* eslint-disable react-hooks/refs */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bed,
  Briefcase,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Route,
  TriangleAlert,
  Wifi,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EVENT_ICONS, MODE_ICONS } from "@/components/common/icons";
import { Badge } from "@/components/ui/badge";
import { useSheets } from "@/components/forms/sheets-provider";
import type { DayPlan, TimelineItem } from "@/lib/calc/timeline";
import { fmtDuration, toMinutes } from "@/lib/calc/dates";
import { MODE_LABEL } from "@/lib/calc/transport";
import { STATUS_LABEL } from "@/lib/calc/bookings";
import { money } from "@/lib/format";
import { moveEvent, reorderEvents } from "@/lib/store/actions";
import type { CurrencyCode, Trip } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/lib/store/hooks";

interface Props {
  plan: DayPlan;
  trip: Trip;
  isToday?: boolean;
  nowTime?: string;
  editable?: boolean;
  /** Show the empty-evening hint ("You're free after work"). */
  hints?: boolean;
  className?: string;
}

export function useOpenItem() {
  const sheets = useSheets();
  const router = useRouter();
  return React.useCallback(
    (item: TimelineItem) => {
      const s = item.source;
      switch (s.kind) {
        case "event":
          return sheets.open({ type: "event", id: s.id });
        case "transport":
          return sheets.open({ type: "transport", id: s.id });
        case "accommodation":
          return sheets.open({ type: "accommodation", id: s.id });
        case "exam":
          return sheets.open({ type: "exam", id: s.id });
        case "decision":
          return router.push(`/trip/transport?id=${s.id}`);
        case "work":
          return sheets.open({ type: "work", date: item.date });
      }
    },
    [sheets, router],
  );
}

function isPast(item: TimelineItem, nowTime?: string) {
  if (!nowTime || !item.time) return false;
  const end = item.endTime ?? item.time;
  return toMinutes(end) < toMinutes(nowTime);
}

export function DayTimeline({ plan, trip, isToday, nowTime, editable, hints = true, className }: Props) {
  const open = useOpenItem();
  const sheets = useSheets();
  const desktop = useIsDesktop();
  const c = trip.currency;
  const ws = trip.workSchedule;

  // Where to draw the "now" line among timed items.
  const nowIndex = React.useMemo(() => {
    if (!isToday || !nowTime) return -1;
    const n = toMinutes(nowTime);
    const idx = plan.timed.findIndex((i) => !!i.time && toMinutes(i.time) > n);
    return idx === -1 ? plan.timed.length : idx;
  }, [isToday, nowTime, plan.timed]);

  const lastTimed = plan.timed[plan.timed.length - 1];
  const workEnd = ws.end;
  const freeAfterWork =
    hints &&
    plan.isWorkDay &&
    !plan.timed.some((i) => i.kind !== "work" && i.time && toMinutes(i.time) >= toMinutes(workEnd));
  const empty = plan.items.length === 0;

  return (
    <div className={cn("relative", className)}>
      {empty ? (
        <div className="flex items-center gap-4 py-4">
          <span className="w-12 shrink-0" />
          <div className="flex-1 border-l border-dashed pl-5">
            <p className="text-[14px] font-medium">Nothing planned{plan.isDayOff ? " — day off" : ""}.</p>
            <p className="text-[13px] text-muted-foreground">A free day. Add something, or leave it open.</p>
          </div>
        </div>
      ) : (
        <ol className="relative">
          {plan.timed.map((item, i) => (
            <React.Fragment key={item.key}>
              {i === nowIndex && <NowLine time={nowTime!} />}
              <Row
                item={item}
                currency={c}
                past={isToday ? isPast(item, nowTime) : false}
                active={!!(isToday && nowTime && item.kind === "work" && toMinutes(item.time!) <= toMinutes(nowTime) && toMinutes(item.endTime!) > toMinutes(nowTime))}
                last={i === plan.timed.length - 1 && plan.flexible.length === 0 && !freeAfterWork}
                onOpen={() => open(item)}
                wifi={item.kind === "work" && ws.showWifiInfo ? plan.stayTonight?.wifi : undefined}
                stayName={plan.stayTonight?.property}
              />
            </React.Fragment>
          ))}
          {nowIndex === plan.timed.length && plan.timed.length > 0 && isToday && <NowLine time={nowTime!} />}
          {freeAfterWork && lastTimed && (
            <li className="flex gap-3">
              <span className="w-12 shrink-0 pt-0.5 text-right font-mono text-[12px] text-subtle-foreground">{workEnd}</span>
              <span className="relative flex w-4 justify-center">
                <span className="mt-1.5 size-2 rounded-full border border-dashed border-border-strong" />
              </span>
              <div className="flex-1 pb-5">
                <p className="text-[13px] text-muted-foreground">You’re free after work.</p>
                {editable !== false && (
                  <button
                    type="button"
                    onClick={() => sheets.open({ type: "event", date: plan.date, eventType: "activity" })}
                    className="mt-0.5 text-[13px] font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Plan something for the evening
                  </button>
                )}
              </div>
            </li>
          )}
        </ol>
      )}

      {plan.flexible.length > 0 && (
        <FlexibleList items={plan.flexible} onOpen={open} reorderable={!!editable} desktop={desktop} />
      )}

      {editable && (
        <div className="flex gap-3 pt-1">
          <span className="w-12 shrink-0" />
          <span className="w-4" />
          <button
            type="button"
            onClick={() => sheets.open({ type: "event", date: plan.date })}
            className="-ml-1 flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-4" /> Add to {isToday ? "today" : "this day"}
          </button>
        </div>
      )}
    </div>
  );
}

function NowLine({ time }: { time: string }) {
  return (
    <li aria-label={`Now, ${time}`} className="relative flex items-center gap-3 py-1">
      <span className="w-12 shrink-0 text-right font-mono text-[11px] font-semibold text-signal">{time}</span>
      <span className="relative flex w-4 justify-center">
        <span className="size-2.5 rounded-full bg-signal ring-4 ring-signal/15" />
      </span>
      <span className="h-px flex-1 bg-signal/60" />
    </li>
  );
}

function RailIcon({ item }: { item: TimelineItem }) {
  const base = "relative z-10 grid size-6 place-content-center rounded-full border bg-surface text-muted-foreground [&_svg]:size-3.5";
  switch (item.kind) {
    case "leg":
    case "arrival": {
      const I = MODE_ICONS[item.mode ?? "other"];
      return (
        <span className={cn(base, "border-foreground/80 text-foreground")}>
          <I />
        </span>
      );
    }
    case "check_in":
      return (
        <span className={base}>
          <LogIn />
        </span>
      );
    case "check_out":
      return (
        <span className={base}>
          <LogOut />
        </span>
      );
    case "exam":
      return (
        <span className={cn(base, "border-signal bg-signal-soft text-signal-foreground")}>
          <GraduationCap />
        </span>
      );
    case "decision":
      return (
        <span className={cn(base, "border-dashed border-warning text-warning-foreground")}>
          <Route />
        </span>
      );
    default: {
      if (item.eventType === "note" || item.eventType === "errand") {
        return (
          <span className="relative z-10 flex size-6 items-center justify-center">
            <span className="size-2 rounded-full bg-border-strong" />
          </span>
        );
      }
      return (
        <span className="relative z-10 flex size-6 items-center justify-center">
          <span className="size-2.5 rounded-full border-2 border-foreground bg-surface" />
        </span>
      );
    }
  }
}

function Row({
  item,
  currency,
  past,
  active,
  last,
  onOpen,
  wifi,
  stayName,
}: {
  item: TimelineItem;
  currency: CurrencyCode;
  past: boolean;
  active: boolean;
  last: boolean;
  onOpen: () => void;
  wifi?: { available: boolean; speedMbps?: number; network?: string };
  stayName?: string;
}) {
  if (item.kind === "work") {
    const dur = toMinutes(item.endTime!) - toMinutes(item.time!);
    return (
      <li className={cn("group flex gap-3", past && "opacity-55")}>
        <span className="w-12 shrink-0 pt-2 text-right font-mono text-[12px] leading-tight text-muted-foreground">
          {item.time}
          <br />
          <span className="text-subtle-foreground">{item.endTime}</span>
        </span>
        <span className="relative flex w-4 justify-center">
          <span className={cn("absolute inset-y-0 w-1.5 rounded-full work-stripes", active && "bg-foreground/10")} />
        </span>
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "mb-3 flex min-w-0 flex-1 items-start justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors work-stripes hover:border-border-strong",
            active && "border-foreground/30",
          )}
        >
          <span>
            <span className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
              <Briefcase className="size-4 text-muted-foreground" /> Work
              {active && <Badge tone="signal">In progress</Badge>}
            </span>
            <span className="mt-0.5 block text-[12px] text-muted-foreground">
              {fmtDuration(dur)} protected
              {stayName && wifi?.available ? ` · ${stayName}` : ""}
            </span>
          </span>
          {wifi && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Wifi className="size-3" />
              {wifi.available ? (wifi.speedMbps ? `${wifi.speedMbps} Mbps` : "Wi-Fi") : "No Wi-Fi"}
            </span>
          )}
        </button>
      </li>
    );
  }

  const meta: string[] = [];
  if (item.kind === "leg" && item.mode) {
    meta.push(MODE_LABEL[item.mode]);
    if (item.endTime) meta.push(`arr ${item.endTime}`);
    if (item.subtitle) meta.push(item.subtitle);
  } else if (item.kind === "exam") {
    meta.push(`${item.time}–${item.endTime}`);
    if (item.location) meta.push(item.location);
  } else {
    if (item.endTime) meta.push(`until ${item.endTime}`);
    if (item.location) meta.push(item.location);
    if (item.subtitle && item.kind !== "decision") meta.push(item.subtitle);
  }

  const showStatus = item.status && item.status !== "confirmed" && item.kind !== "check_out";
  const statusTone = item.status === "need_to_book" ? "warning" : item.status === "cancelled" ? "danger" : "neutral";

  return (
    <li className={cn("group flex gap-3", past && "opacity-55")}>
      <span className="w-12 shrink-0 pt-[3px] text-right font-mono text-[12px] text-muted-foreground tabular">{item.time ?? ""}</span>
      <span className="relative flex w-4 justify-center">
        {!last && <span aria-hidden className="absolute top-6 bottom-0 w-px bg-border" />}
        <span className="-mx-1">
          <RailIcon item={item} />
        </span>
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="-mt-1 mb-2 flex min-h-11 min-w-0 flex-1 items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/70 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <span className="min-w-0">
          <span
            className={cn(
              "block text-[14px] leading-snug",
              item.kind === "leg" || item.kind === "exam" || item.kind === "decision" ? "font-semibold tracking-tight" : "font-medium",
              item.kind === "arrival" && "font-normal text-muted-foreground",
              (item.eventType === "note" || item.eventType === "errand") && "font-normal",
            )}
          >
            {item.kind === "exam" ? `Exam · ${item.title}` : item.title}
          </span>
          {meta.length > 0 && <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{meta.join(" · ")}</span>}
          {(showStatus || (item.workOverlapMin > 0 && !item.keptDespiteWork) || item.kind === "decision") && (
            <span className="mt-1.5 flex flex-wrap gap-1">
              {item.kind === "decision" ? (
                <Badge tone="warning">
                  Not decided <ArrowRight /> Compare options
                </Badge>
              ) : (
                showStatus && <Badge tone={statusTone}>{STATUS_LABEL[item.status!]}</Badge>
              )}
              {item.workOverlapMin > 0 && !item.keptDespiteWork && item.kind !== "exam" && (
                <Badge tone="warning">
                  <TriangleAlert /> Overlaps work {fmtDuration(item.workOverlapMin)}
                </Badge>
              )}
              {item.kind === "exam" && item.workOverlapMin > 0 && (
                <Badge tone="warning">
                  <TriangleAlert /> Work day — take leave?
                </Badge>
              )}
            </span>
          )}
        </span>
        {item.cost ? <span className="shrink-0 pt-px text-[13px] tabular text-muted-foreground">{money(item.cost, currency)}</span> : null}
      </button>
    </li>
  );
}

function FlexibleList({
  items,
  onOpen,
  reorderable,
  desktop,
}: {
  items: TimelineItem[];
  onOpen: (i: TimelineItem) => void;
  reorderable: boolean;
  desktop: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const eventItems = items.filter((i) => i.source.kind === "event");
  const ids = eventItems.map((i) => (i.source as { id: string }).id);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    reorderEvents(arrayMove(ids, from, to));
  };

  const list = (
    <ul className="grid grid-cols-1">
      {items.map((item, idx) => {
        const id = item.source.kind === "event" ? item.source.id : item.key;
        return (
          <FlexibleRow
            key={item.key}
            id={id}
            item={item}
            onOpen={() => onOpen(item)}
            reorderable={reorderable && item.source.kind === "event"}
            desktop={desktop}
            first={idx === 0}
            lastIdx={idx === items.length - 1}
          />
        );
      })}
    </ul>
  );

  return (
    <div className="mt-1 flex gap-3">
      <span className="w-12 shrink-0 pt-2.5 text-right eyebrow !text-[10px]">Anytime</span>
      <span className="w-4" />
      <div className="min-w-0 flex-1 border-l border-dashed pl-1">
        {reorderable && desktop ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {list}
            </SortableContext>
          </DndContext>
        ) : (
          list
        )}
      </div>
    </div>
  );
}

function FlexibleRow({
  id,
  item,
  onOpen,
  reorderable,
  desktop,
  first,
  lastIdx,
}: {
  id: string;
  item: TimelineItem;
  onOpen: () => void;
  reorderable: boolean;
  desktop: boolean;
  first: boolean;
  lastIdx: boolean;
}) {
  const sortable = useSortable({ id, disabled: !reorderable || !desktop });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  const Icon = item.eventType ? EVENT_ICONS[item.eventType] : item.kind === "check_in" || item.kind === "check_out" ? Bed : MapPin;
  return (
    <li
      ref={sortable.setNodeRef}
      style={style}
      className={cn("group flex items-center gap-1 rounded-md", sortable.isDragging && "relative z-10 bg-surface shadow-md")}
    >
      {reorderable && desktop && (
        <button
          type="button"
          aria-label={`Reorder ${item.title}`}
          className="grid h-9 w-6 cursor-grab place-content-center text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-left text-[14px] transition-colors hover:bg-muted/70"
      >
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
        {item.status && item.status !== "confirmed" && <Badge tone={item.status === "need_to_book" ? "warning" : "neutral"}>{STATUS_LABEL[item.status]}</Badge>}
      </button>
      {reorderable && !desktop && (
        <span className="flex shrink-0">
          <button
            type="button"
            aria-label={`Move ${item.title} up`}
            disabled={first}
            onClick={() => moveEvent(id, -1)}
            className="grid size-9 place-content-center rounded-md text-muted-foreground disabled:opacity-30"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Move ${item.title} down`}
            disabled={lastIdx}
            onClick={() => moveEvent(id, 1)}
            className="grid size-9 place-content-center rounded-md text-muted-foreground disabled:opacity-30"
          >
            <ChevronDown className="size-4" />
          </button>
        </span>
      )}
    </li>
  );
}
