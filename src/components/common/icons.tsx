import {
  Bed,
  Bike,
  Briefcase,
  Bus,
  Car,
  CircleEllipsis,
  Coffee,
  Footprints,
  Fuel,
  GraduationCap,
  LifeBuoy,
  Plane,
  Ship,
  ShoppingBag,
  StickyNote,
  Sun,
  Ticket,
  TrainFront,
  TramFront,
  Utensils,
  Route,
  Laptop,
  Armchair,
  type LucideIcon,
  CircleDot,
} from "lucide-react";
import type { EventType, TransportMode } from "@/lib/types";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  bed: Bed,
  train: TrainFront,
  bus: Bus,
  utensils: Utensils,
  ticket: Ticket,
  coffee: Coffee,
  bike: Bike,
  fuel: Fuel,
  "shopping-bag": ShoppingBag,
  "graduation-cap": GraduationCap,
  "life-buoy": LifeBuoy,
  "circle-ellipsis": CircleEllipsis,
  plane: Plane,
  laptop: Laptop,
  sun: Sun,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const I = CATEGORY_ICONS[icon] ?? CircleEllipsis;
  return <I className={className} />;
}

export const MODE_ICONS: Record<TransportMode, LucideIcon> = {
  bus: Bus,
  train: TrainFront,
  flight: Plane,
  cab: Car,
  auto: Car,
  ferry: Ship,
  metro: TramFront,
  scooter: Bike,
  walk: Footprints,
  other: Route,
};

export const EVENT_ICONS: Record<EventType, LucideIcon> = {
  activity: Ticket,
  food: Utensils,
  free_time: Armchair,
  note: StickyNote,
  work_session: Briefcase,
  errand: CircleDot,
  other: CircleDot,
};
