"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/lib/store/hooks";
import { destinationState, destinationsForTrip, nights } from "@/lib/calc/trip";
import { fmtRange } from "@/lib/calc/dates";
import { INDIA_OUTLINE, lookupPlace } from "@/lib/geo";
import { deleteDestination, reorderDestinations, saveDestination } from "@/lib/store/actions";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import type { Destination, Trip } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Route map. Renders an offline mock (projected SVG) by default.
 * To use a real provider later, implement <ProviderRouteMap> with the same props
 * and switch on NEXT_PUBLIC_MAP_PROVIDER — no paid API is required to run the app.
 */
export function RouteMap({ destinations, today }: { destinations: Destination[]; today: string }) {
  return <MockRouteMap destinations={destinations} today={today} />;
}

function MockRouteMap({ destinations, today }: { destinations: Destination[]; today: string }) {
  const placed = destinations.filter((d) => d.lat !== undefined && d.lng !== undefined);
  const W = 600;
  const H = 640;
  const pad = 60;

  const view = React.useMemo(() => {
    if (!placed.length) return null;
    let minLat = Math.min(...placed.map((d) => d.lat!));
    let maxLat = Math.max(...placed.map((d) => d.lat!));
    let minLng = Math.min(...placed.map((d) => d.lng!));
    let maxLng = Math.max(...placed.map((d) => d.lng!));
    // Ensure a sensible minimum span and padding
    const latSpan = Math.max(2, maxLat - minLat);
    const lngSpan = Math.max(2, maxLng - minLng);
    const cLat = (minLat + maxLat) / 2;
    const cLng = (minLng + maxLng) / 2;
    const k = Math.min((W - pad * 2) / (lngSpan * Math.cos((cLat * Math.PI) / 180)), (H - pad * 2) / latSpan);
    minLat = cLat - (H / 2) / k;
    maxLat = cLat + (H / 2) / k;
    const kx = k * Math.cos((cLat * Math.PI) / 180);
    minLng = cLng - W / 2 / kx;
    maxLng = cLng + W / 2 / kx;
    const project = (lat: number, lng: number) => ({ x: (lng - minLng) * kx, y: (maxLat - lat) * k });
    return { project, minLat, maxLat, minLng, maxLng };
  }, [placed]);

  if (!view) {
    return (
      <div className="grid aspect-square place-content-center rounded-xl border bg-surface-2 text-[13px] text-muted-foreground">
        Add destinations to see your route.
      </div>
    );
  }

  const pts = placed.map((d) => ({ d, ...view.project(d.lat!, d.lng!), state: destinationState(d, today) }));
  const outline = INDIA_OUTLINE.map(([lat, lng]) => view.project(lat, lng));
  const outlinePath = outline.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + "Z";

  // Labels: alternate sides, then push apart vertically to avoid collisions.
  const labels = pts.map((p, i) => ({ ...p, side: p.x > W * 0.62 ? "left" : i % 2 === 0 ? "right" : "left", ly: p.y }));
  for (const side of ["left", "right"]) {
    const group = labels.filter((l) => l.side === side).sort((a, b) => a.ly - b.ly);
    for (let i = 1; i < group.length; i++) if (group[i].ly - group[i - 1].ly < 20) group[i].ly = group[i - 1].ly + 20;
  }

  const gridLines: React.ReactNode[] = [];
  for (let lat = Math.ceil(view.minLat / 2) * 2; lat < view.maxLat; lat += 2) {
    const y = view.project(lat, view.minLng).y;
    gridLines.push(<line key={`la${lat}`} x1={0} x2={W} y1={y} y2={y} className="stroke-border" strokeWidth={0.6} />);
  }
  for (let lng = Math.ceil(view.minLng / 2) * 2; lng < view.maxLng; lng += 2) {
    const x = view.project(view.minLat, lng).x;
    gridLines.push(<line key={`lo${lng}`} y1={0} y2={H} x1={x} x2={x} className="stroke-border" strokeWidth={0.6} />);
  }

  return (
    <figure className="relative overflow-hidden rounded-xl border bg-surface-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Route: ${placed.map((p) => p.name).join(" to ")}`} className="block h-auto w-full">
        {gridLines}
        <path d={outlinePath} className="fill-surface stroke-border-strong" strokeWidth={1} />
        {pts.slice(1).map((p, i) => {
          const a = pts[i];
          const done = p.state !== "upcoming";
          const mx = (a.x + p.x) / 2 + (p.y - a.y) * 0.12;
          const my = (a.y + p.y) / 2 - (p.x - a.x) * 0.12;
          return (
            <path
              key={p.d.id}
              d={`M${a.x},${a.y} Q${mx},${my} ${p.x},${p.y}`}
              fill="none"
              className={done ? "stroke-foreground" : "stroke-foreground/45"}
              strokeWidth={done ? 2 : 1.6}
              strokeDasharray={done ? undefined : "4 5"}
              strokeLinecap="round"
            />
          );
        })}
        {labels.map((p) => (
          <g key={p.d.id}>
            {p.state === "current" && <circle cx={p.x} cy={p.y} r={14} className="fill-signal/20" />}
            <circle
              cx={p.x}
              cy={p.y}
              r={p.state === "current" ? 7 : 5}
              className={cn(
                p.state === "completed" && "fill-foreground",
                p.state === "current" && "fill-signal stroke-surface",
                p.state === "upcoming" && "fill-surface stroke-foreground",
              )}
              strokeWidth={p.state === "current" ? 2.5 : 1.6}
            />
            {Math.abs(p.ly - p.y) > 2 && (
              <line x1={p.x} y1={p.y} x2={p.side === "right" ? p.x + 12 : p.x - 12} y2={p.ly} className="stroke-border-strong" strokeWidth={0.8} />
            )}
            <text
              x={p.side === "right" ? p.x + 14 : p.x - 14}
              y={p.ly + 4}
              textAnchor={p.side === "right" ? "start" : "end"}
              className={cn("fill-foreground text-[12px]", p.state === "current" ? "font-semibold" : "font-medium", p.state === "upcoming" && "fill-muted-foreground")}
              style={{ paintOrder: "stroke", stroke: "var(--surface-2)", strokeWidth: 4 }}
            >
              {p.d.name}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="absolute bottom-2 left-3 text-[10px] text-subtle-foreground">Offline route sketch · not to scale for navigation</figcaption>
    </figure>
  );
}

export function TripMap({ trip, today }: { trip: Trip; today: string }) {
  const data = useData();
  const dests = destinationsForTrip(data, trip.id);
  const [editing, setEditing] = React.useState<Destination | "new" | null>(null);

  const move = (idx: number, dir: -1 | 1) => {
    const ids = dests.map((d) => d.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    reorderDestinations(trip.id, ids);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <RouteMap destinations={dests} today={today} />
      <div>
        <div className="flex items-center justify-between">
          <h3 className="eyebrow">Route</h3>
          <Button size="sm" variant="ghost" onClick={() => setEditing("new")}>
            <Plus /> Destination
          </Button>
        </div>
        {dests.length === 0 ? (
          <EmptyState compact icon={MapPin} title="Add your first route" description="Add the places you’ll pass through, in order." />
        ) : (
          <ol className="mt-2">
            {dests.map((d, i) => {
              const state = destinationState(d, today);
              const n = d.arriveDate && d.departDate ? nights(d.arriveDate, d.departDate) : 0;
              return (
                <li key={d.id} className="group relative flex gap-3">
                  <span className="relative flex w-4 justify-center">
                    {i < dests.length - 1 && (
                      <span className={cn("absolute top-5 bottom-0 w-px", state === "completed" ? "bg-foreground" : "border-l border-dashed border-border-strong")} />
                    )}
                    <span
                      className={cn(
                        "relative z-10 mt-1.5 size-3 rounded-full border-2",
                        state === "completed" && "border-foreground bg-foreground",
                        state === "current" && "border-signal bg-signal ring-4 ring-signal/20",
                        state === "upcoming" && "border-foreground bg-surface",
                      )}
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pb-5">
                    <div className="min-w-0">
                      <p className={cn("text-[14px] font-semibold tracking-tight", state === "upcoming" && "text-foreground/80")}>
                        {d.name}
                        {state === "current" && <Badge tone="signal" className="ml-2 align-middle">You’re here</Badge>}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {d.arriveDate && d.departDate ? `${fmtRange(d.arriveDate, d.departDate)}${n ? ` · ${n} ${n === 1 ? "night" : "nights"}` : " · passing through"}` : "Dates not set"}
                        {d.lat === undefined && " · not on map"}
                      </p>
                    </div>
                    <div className="flex shrink-0 opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:focus-within:opacity-100">
                      <Button variant="ghost" size="icon-sm" aria-label={`Move ${d.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                        <ChevronUp />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Move ${d.name} down`} disabled={i === dests.length - 1} onClick={() => move(i, 1)}>
                        <ChevronDown />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${d.name}`} onClick={() => setEditing(d)}>
                        <Pencil />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {editing && (
        <DestinationSheet
          trip={trip}
          destination={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function DestinationSheet({ trip, destination, onClose }: { trip: Trip; destination?: Destination; onClose: () => void }) {
  const [open, setOpen] = React.useState(true);
  const [name, setName] = React.useState(destination?.name ?? "");
  const [arrive, setArrive] = React.useState(destination?.arriveDate ?? "");
  const [depart, setDepart] = React.useState(destination?.departDate ?? "");
  const [lat, setLat] = React.useState(destination?.lat?.toString() ?? "");
  const [lng, setLng] = React.useState(destination?.lng?.toString() ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const known = lookupPlace(name);

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) setTimeout(onClose, 200);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name the place";
    if (arrive && depart && depart < arrive) errs.depart = "Leave date can't be before arrival";
    if (lat && (Number.isNaN(Number(lat)) || Math.abs(Number(lat)) > 90)) errs.lat = "Invalid latitude";
    if (lng && (Number.isNaN(Number(lng)) || Math.abs(Number(lng)) > 180)) errs.lng = "Invalid longitude";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const useKnown = !lat && !lng && known;
    saveDestination({
      id: destination?.id,
      order: destination?.order,
      tripId: trip.id,
      name: name.trim(),
      region: useKnown ? known.region : destination?.region,
      lat: lat ? Number(lat) : useKnown ? known.lat : undefined,
      lng: lng ? Number(lng) : useKnown ? known.lng : undefined,
      arriveDate: arrive || undefined,
      departDate: depart || undefined,
    });
    toast.success(destination ? "Destination updated" : "Destination added");
    close(false);
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={close}
      title={destination ? "Edit destination" : "Add destination"}
      footer={
        <>
          {destination && (
            <Button
              variant="destructive-ghost"
              className="lg:mr-auto lg:flex-none"
              onClick={() => {
                deleteDestination(destination.id);
                toast("Destination removed");
                close(false);
              }}
            >
              <Trash2 /> Remove
            </Button>
          )}
          <Button type="submit" form="dest-form" size="lg" className="lg:h-10">
            Save
          </Button>
        </>
      }
    >
      <form id="dest-form" onSubmit={save} className="grid grid-cols-1 gap-4" noValidate>
        <Field label="Place" htmlFor="d-name" error={errors.name} hint={known && !lat ? `Found on map · ${known.region}` : undefined}>
          <Input id="d-name" autoFocus value={name} aria-invalid={!!errors.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alleppey" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Arrive" htmlFor="d-arr" optional>
            <Input id="d-arr" type="date" min={trip.startDate} max={trip.endDate} value={arrive} onChange={(e) => setArrive(e.target.value)} />
          </Field>
          <Field label="Leave" htmlFor="d-dep" optional error={errors.depart}>
            <Input id="d-dep" type="date" min={trip.startDate} max={trip.endDate} value={depart} aria-invalid={!!errors.depart} onChange={(e) => setDepart(e.target.value)} />
          </Field>
          <Field label="Latitude" htmlFor="d-lat" optional error={errors.lat}>
            <Input id="d-lat" inputMode="decimal" value={lat} placeholder={known ? String(known.lat) : ""} onChange={(e) => setLat(e.target.value)} />
          </Field>
          <Field label="Longitude" htmlFor="d-lng" optional error={errors.lng}>
            <Input id="d-lng" inputMode="decimal" value={lng} placeholder={known ? String(known.lng) : ""} onChange={(e) => setLng(e.target.value)} />
          </Field>
        </div>
      </form>
    </ResponsiveSheet>
  );
}
