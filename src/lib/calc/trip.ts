import type { Accommodation, AppData, Destination, ISODate, Trip, TripPhase } from "@/lib/types";
import { diffDays, isBetween } from "./dates";

export function totalTripDays(trip: Pick<Trip, "startDate" | "endDate">) {
  return Math.max(1, diffDays(trip.startDate, trip.endDate) + 1);
}

export type TripStage = "upcoming" | "active" | "completed";

export function tripStage(trip: Trip, today: ISODate): TripStage {
  if (today < trip.startDate) return "upcoming";
  if (today > trip.endDate) return "completed";
  return "active";
}

/** 1-based day number of `today` within the trip (clamped). */
export function dayNumber(trip: Trip, today: ISODate) {
  return Math.min(totalTripDays(trip), Math.max(1, diffDays(trip.startDate, today) + 1));
}

/** Days fully behind us (not counting today). */
export function daysCompleted(trip: Trip, today: ISODate) {
  if (today < trip.startDate) return 0;
  if (today > trip.endDate) return totalTripDays(trip);
  return diffDays(trip.startDate, today);
}

/** Days left including today. */
export function daysRemaining(trip: Trip, today: ISODate) {
  if (today > trip.endDate) return 0;
  if (today < trip.startDate) return totalTripDays(trip);
  return diffDays(today, trip.endDate) + 1;
}

export function daysUntilStart(trip: Trip, today: ISODate) {
  return Math.max(0, diffDays(today, trip.startDate));
}

export function tripProgress(trip: Trip, today: ISODate) {
  return daysCompleted(trip, today) / totalTripDays(trip);
}

export function phasesForTrip(data: AppData, tripId: string): TripPhase[] {
  return data.phases.filter((p) => p.tripId === tripId).sort((a, b) => a.startDate.localeCompare(b.startDate) || a.order - b.order);
}

/** When phases share a boundary day (12 Dec), the later phase wins from that day on. */
export function phaseOn(phases: TripPhase[], date: ISODate): TripPhase | undefined {
  const matches = phases.filter((p) => isBetween(date, p.startDate, p.endDate));
  return matches[matches.length - 1];
}

export function destinationsForTrip(data: AppData, tripId: string): Destination[] {
  return data.destinations.filter((d) => d.tripId === tripId).sort((a, b) => a.order - b.order);
}

export function stayOn(stays: Accommodation[], date: ISODate): Accommodation | undefined {
  // The night of `date` — check-in ≤ date < check-out.
  return stays.find((s) => s.booking.status !== "cancelled" && date >= s.checkIn && date < s.checkOut);
}

/** Best guess at where the traveller is on a date: stay → destination window → phase location. */
export function locationOn(data: AppData, trip: Trip, date: ISODate): string {
  const stays = data.accommodations.filter((a) => a.tripId === trip.id);
  const stay = stayOn(stays, date);
  if (stay) return stay.city;
  const dest = destinationsForTrip(data, trip.id).find(
    (d) =>
      d.arriveDate &&
      d.departDate &&
      d.arriveDate <= date &&
      (date < d.departDate || (d.arriveDate === d.departDate && d.arriveDate === date)),
  );
  if (dest) return dest.name;
  const phase = phaseOn(phasesForTrip(data, trip.id), date);
  return phase?.location ?? trip.name;
}

export type DestinationState = "completed" | "current" | "upcoming";

export function destinationState(d: Destination, today: ISODate): DestinationState {
  if (d.departDate && today >= d.departDate) return "completed";
  if (d.arriveDate && today >= d.arriveDate) return "current";
  return "upcoming";
}

export function routeLabel(data: AppData, tripId: string) {
  const dests = destinationsForTrip(data, tripId);
  if (dests.length < 2) return dests[0]?.name ?? "";
  // Use phase-level summary when available (e.g. "Kerala → Jaipur").
  const phases = phasesForTrip(data, tripId);
  if (phases.length >= 2) return phases.map((p) => p.location).join(" → ");
  return `${dests[0].name} → ${dests[dests.length - 1].name}`;
}

export function nights(checkIn: ISODate, checkOut: ISODate) {
  return Math.max(0, diffDays(checkIn, checkOut));
}
