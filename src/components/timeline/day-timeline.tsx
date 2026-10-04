"use client";

/* dnd-kit returns ref-backed props from useSortable; the React Compiler lint flags them as a false positive. */
/* eslint-disable react-hooks/refs */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  LogIn,
  LogOut,
  Plus,
  Route,
  TriangleAlert,
  Wifi,
  GripVertical,
  type LucideIcon,
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
import { STATUS_LABEL, paidFor } from "@/lib/calc/bookings";
import { money } from "@/lib/format";
import { moveEvent, reorderEvents } from "@/lib/store/actions";
import type { CurrencyCode, Trip } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useData, useIsDesktop } from "@/lib/store/hooks";

interface Props {
  plan: DayPlan;
  trip: Trip;
  isToday?: boolean;
  nowTime?: string;
  editable?: boolean;
  /** Show the empty-evening hint ("You're free after work"). */
  hints?: boolean;
  /** Dense rendering for multi-day overviews: work collapses to one quiet line. */
  compact?: boolean;
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

/* ------------------------------------------------------------------ rail */

/** Left rail cell: a round node with the connecting line underneath. */
function Rail({ children, line = true, className }: { children: React.ReactNode; line?: boolean; className?: string }) {
  return (
    <span className={cn("relative flex w-10 shrink-0 justify-center", className)}>
      {line && <span aria-hidden className="absolute top-10 -bottom-1 w-px bg-border" />}
      {children}
    </span>
  );
}

function Node({ icon: Icon, tone = "outline", small }: { icon?: LucideIcon; tone?: "outline" | "strong" | "signal" | "warning" | "work" | "dot"; small?: boolean }) {
  if (tone === "dot" || !Icon) {
    return (
      <span className="relative z-10 grid size-10 place-content-center">
        <span className="size-2.5 rounded-full border-2 border-border-strong bg-surface" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 grid place-content-center rounded-full",
        small ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-[18px]",
        tone === "outline" && "border bg-surface text-foreground/75",
        tone === "strong" && "bg-primary text-primary-foreground",
        tone === "signal" && "bg-signal-soft text-signal-foreground",
        tone === "warning" && "border border-dashed border-warning bg-warning-soft text-warning-foreground",
        tone === "work" && "work-stripes border text-muted-foreground",
      )}
    >
      <Icon />
    </span>
  );
}

function nodeFor(item: TimelineItem): { icon?: LucideIcon; tone: React.ComponentProps<typeof Node>["tone"] } {
  switch (item.kind) {
    case "leg":
      return { icon: MODE_ICONS[item.mode ?? "other"], tone: "strong" };
    case "arrival":
      return { icon: MODE_ICONS[item.mode ?? "other"], tone: "outline" };
    case "check_in":
      return { icon: LogIn, tone: "outline" };
    case "check_out":
      return { icon: LogOut, tone: "outline" };
    case "exam":
      return { icon: GraduationCap, tone: "signal" };
    case "decision":
      return { icon: Route, tone: "warning" };
    case "work":
      return { icon: Briefcase, tone: "work" };
    default:
      if (item.eventType === "note" || item.eventType === "errand") return { tone: "dot" };
      return { icon: item.eventType ? EVENT_ICONS[item.eventType] : undefined, tone: "outline" };
  }
}

/* -------------------------------------------------------------- timeline */

export function DayTimeline({ plan, trip, isToday, nowTime, editable, hints = true, compact, className }: Props) {
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

  const workEnd = ws.end;
  const freeAfterWork =
    hints &&
    plan.isWorkDay &&
    !plan.timed.some((i) => i.kind !== "work" && i.time && toMinutes(i.time) >= toMinutes(workEnd));
  const empty = plan.items.length === 0;

  return (
    <div className={cn("relative", className)}>
      {empty ? (
        <div className="flex items-center gap-3 py-1">
          <Rail line={false}>
            <span className="grid size-10 place-content-center rounded-full border border-dashed text-subtle-foreground">
              <span className="size-1.5 rounded-full bg-current" />
            </span>
          </Rail>
          <div>
            <p className="text-[15px] font-medium">Nothing planned{plan.isDayOff ? " — day off" : ""}</p>
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
                last={i === plan.timed.length - 1 && plan.flexible.length === 0 && !freeAfterWork && !editable}
                onOpen={() => open(item)}
                wifi={item.kind === "work" && ws.showWifiInfo ? plan.stayTonight?.wifi : undefined}
                compact={compact}
              />
            </React.Fragment>
          ))}
          {nowIndex === plan.timed.length && plan.timed.length > 0 && isToday && <NowLine time={nowTime!} />}
          {freeAfterWork && (
            <li className="flex gap-3">
              <Rail line={plan.flexible.length > 0 || !!editable}>
                <Node tone="dot" />
              </Rail>
              <div className="flex-1 pb-4 pt-2">
                <p className="text-[14px] text-muted-foreground">Free after {workEnd}.</p>
                {editable !== false && (
                  <button
                    type="button"
                    onClick={() => sheets.open({ type: "event", date: plan.date, eventType: "activity" })}
                    className="text-[14px] font-medium text-accent-foreground underline-offset-4 hover:underline"
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
        <FlexibleList items={plan.flexible} onOpen={open} reorderable={!!editable} desktop={desktop} hasRailAfter={!!editable} />
      )}

      {editable && (
        <button
          type="button"
          onClick={() => sheets.open({ type: "event", date: plan.date })}
          className="group flex w-full items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <Rail line={false}>
            <span className="grid size-10 place-content-center rounded-full border border-dashed border-border-strong text-muted-foreground transition-colors group-hover:border-accent group-hover:text-accent-foreground">
              <Plus className="size-[18px]" />
            </span>
          </Rail>
          <span className="text-[15px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            Add to {isToday ? "today" : "this day"}
          </span>
        </button>
      )}
    </div>
  );
}

function NowLine({ time }: { time: string }) {
  return (
    <li aria-label={`Now, ${time}`} className="relative flex items-center gap-3 py-1">
      <span className="relative flex w-10 shrink-0 justify-center">
        <span aria-hidden className="absolute -top-1 -bottom-1 w-px bg-border" />
        <span className="relative size-3 rounded-full bg-signal ring-4 ring-signal/20" />
      </span>
      <span className="text-[12px] font-semibold tabular text-signal-foreground">Now · {time}</span>
      <span className="h-px flex-1 bg-signal/50" />
    </li>
  );
}

function useActual(item: TimelineItem) {
  const data = useData();
  if (item.source.kind === "event" && item.status) return paidFor(data.expenses, "event", item.source.id);
  return 0;
}

function Row({
  item,
  currency,
  past,
  active,
  last,
  onOpen,
  wifi,
  compact,
}: {
  item: TimelineItem;
  currency: CurrencyCode;
  past: boolean;
  active: boolean;
  last: boolean;
  onOpen: () => void;
  wifi?: { available: boolean; speedMbps?: number; network?: string };
  compact?: boolean;
}) {
  const actual = useActual(item);
  const node = nodeFor(item);

  if (item.kind === "work") {
    const dur = toMinutes(item.endTime!) - toMinutes(item.time!);
    return (
      <li className={cn("flex gap-3", past && "opacity-50")}>
        <Rail line={!last}>
          <Node icon={Briefcase} tone="work" small={compact} />
        </Rail>
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "-mx-2 mb-2 flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-2 text-left transition-colors outline-none hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring",
            compact ? "py-1" : "py-1.5",
          )}
        >
          <span className="min-w-0">
            <span className="block text-[13px] tabular text-muted-foreground">
              {item.time} – {item.endTime}
            </span>
            <span className="flex items-center gap-2 text-[15px] text-muted-foreground">
              <span className="font-medium text-foreground/80">Work</span>
              <span className="text-[13px]">{fmtDuration(dur)}</span>
              {active && <Badge tone="signal">Now</Badge>}
            </span>
          </span>
          {wifi && !compact && (
            <span className="flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground">
              <Wifi className="size-3.5" />
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
    if (item.endTime) meta.push(`arrives ${item.endTime}`);
    if (item.subtitle) meta.push(item.subtitle);
  } else if (item.kind === "exam") {
    meta.push("Exam");
    if (item.location) meta.push(item.location);
  } else {
    if (item.location) meta.push(item.location);
    if (item.subtitle && item.kind !== "decision") meta.push(item.subtitle);
  }

  const timeLabel = item.time ? (item.endTime && item.kind !== "leg" ? `${item.time} – ${item.endTime}` : item.time) : undefined;
  const showStatus = item.status && item.status !== "confirmed" && item.kind !== "check_out";
  const statusTone = item.status === "need_to_book" ? "warning" : item.status === "cancelled" ? "danger" : "neutral";
  const strong = item.kind === "leg" || item.kind === "exam" || item.kind === "decision";
  const quiet = item.kind === "arrival" || item.kind === "check_out" || item.eventType === "note" || item.eventType === "errand";

  return (
    <li className={cn("flex gap-3", past && "opacity-50")}>
      <Rail line={!last}>
        <Node icon={node.icon} tone={node.tone} small={compact} />
      </Rail>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "-mx-2 mb-2 flex min-h-11 min-w-0 flex-1 items-start justify-between gap-3 rounded-xl px-2 text-left transition-colors outline-none hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring",
          compact ? "py-1" : "py-1.5",
        )}
      >
        <span className="min-w-0">
          {timeLabel && <span className="block text-[13px] tabular text-muted-foreground">{timeLabel}</span>}
          <span
            className={cn(
              "block text-[15px] leading-snug",
              strong ? "font-semibold tracking-tight" : "font-medium",
              quiet && "font-normal text-foreground/80",
            )}
          >
            {item.title}
          </span>
          {meta.length > 0 && <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{meta.join(" · ")}</span>}
          {(showStatus || (item.workOverlapMin > 0 && !item.keptDespiteWork) || item.kind === "decision") && (
            <span className="mt-1.5 flex flex-wrap gap-1">
              {item.kind === "decision" ? (
                <Badge tone="warning">
                  Not decided <ArrowRight /> Compare
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
        {item.cost ? (
          <span className="shrink-0 pt-0.5 text-right text-[14px] tabular">
            <span className={actual > 0 ? "text-muted-foreground" : "font-medium"}>{money(item.cost, currency)}</span>
            {actual > 0 && <span className="block text-[12px] font-medium text-foreground">paid {money(actual, currency)}</span>}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function FlexibleList({
  items,
  onOpen,
  reorderable,
  desktop,
  hasRailAfter,
}: {
  items: TimelineItem[];
  onOpen: (i: TimelineItem) => void;
  reorderable: boolean;
  desktop: boolean;
  hasRailAfter: boolean;
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
            line={hasRailAfter || idx < items.length - 1}
          />
        );
      })}
    </ul>
  );

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="relative flex w-10 shrink-0 justify-center self-stretch">
          <span aria-hidden className="absolute inset-y-0 w-px bg-border" />
        </span>
        <p className="py-1 text-[13px] font-medium text-muted-foreground">Anytime</p>
      </div>
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
  line,
}: {
  id: string;
  item: TimelineItem;
  onOpen: () => void;
  reorderable: boolean;
  desktop: boolean;
  first: boolean;
  lastIdx: boolean;
  line: boolean;
}) {
  const sortable = useSortable({ id, disabled: !reorderable || !desktop });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  const node = nodeFor(item);
  return (
    <li
      ref={sortable.setNodeRef}
      style={style}
      className={cn("group flex items-center gap-3", sortable.isDragging && "relative z-10 rounded-xl bg-surface shadow-md")}
    >
      <span className="relative flex w-10 shrink-0 justify-center self-stretch">
        {line && <span aria-hidden className="absolute inset-y-0 w-px bg-border" />}
        {!line && <span aria-hidden className="absolute top-0 h-1/2 w-px bg-border" />}
        <span className="relative z-10 grid size-10 place-content-center">
          {node.icon && node.tone !== "dot" ? (
            <span className="grid size-7 place-content-center rounded-full border bg-surface text-foreground/70 [&_svg]:size-3.5">
              <node.icon />
            </span>
          ) : (
            <span className="size-2.5 rounded-full border-2 border-border-strong bg-surface" />
          )}
        </span>
      </span>
      <div className="mb-1 flex min-w-0 flex-1 items-center gap-1">
        <button
          type="button"
          onClick={onOpen}
          className="-mx-2 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 text-left text-[15px] transition-colors outline-none hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          {item.status && item.status !== "confirmed" && <Badge tone={item.status === "need_to_book" ? "warning" : "neutral"}>{STATUS_LABEL[item.status]}</Badge>}
        </button>
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
        {reorderable && !desktop && (
          <span className="flex shrink-0 text-subtle-foreground">
            <button
              type="button"
              aria-label={`Move ${item.title} up`}
              disabled={first}
              onClick={() => moveEvent(id, -1)}
              className="grid size-10 place-content-center rounded-lg disabled:opacity-25"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Move ${item.title} down`}
              disabled={lastIdx}
              onClick={() => moveEvent(id, 1)}
              className="grid size-10 place-content-center rounded-lg disabled:opacity-25"
            >
              <ChevronDown className="size-4" />
            </button>
          </span>
        )}
      </div>
    </li>
  );
}
