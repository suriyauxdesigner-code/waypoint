/**
 * Waypoint domain model.
 *
 * Conventions
 * - Dates are ISO calendar dates: "2026-12-04" (local to the trip, no timezone).
 * - Times are 24h "HH:mm" strings.
 * - Money is stored as integer amounts in the trip currency's major unit (₹ rupees).
 * - Every entity has a string `id` and (where relevant) a `tripId` so a relational
 *   backend (Supabase/Postgres) can mirror these shapes one-to-one.
 */

export type ID = string;
export type ISODate = string; // YYYY-MM-DD
export type HHmm = string; // HH:mm

export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "THB" | "IDR" | "VND" | "JPY";

export interface User {
  id: ID;
  name: string;
  email?: string;
  homeCurrency: CurrencyCode;
}

export type TripPurpose =
  | "backpacking"
  | "vacation"
  | "workation"
  | "remote_work"
  | "study"
  | "exams"
  | "business"
  | "transit"
  | "mixed"
  | "custom";

export interface Destination {
  id: ID;
  tripId: ID;
  name: string;
  region?: string;
  lat?: number;
  lng?: number;
  arriveDate?: ISODate;
  departDate?: ISODate;
  order: number;
}

export interface TripPhase {
  id: ID;
  tripId: ID;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  location: string;
  purposes: TripPurpose[];
  customPurpose?: string;
  budget?: number;
  notes?: string;
  order: number;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export interface WorkSchedule {
  enabled: boolean;
  days: Weekday[];
  start: HHmm;
  end: HHmm;
  timezoneLabel?: string;
  protectWorkHours: boolean;
  preferTransportOutsideWork: boolean;
  showWifiInfo: boolean;
  showWorkspaceStays: boolean;
  /** Dates when the traveller is not working (leave, exams, holidays). */
  daysOff: ISODate[];
}

export interface Trip {
  id: ID;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  purpose: TripPurpose;
  currency: CurrencyCode;
  totalBudget: number;
  workSchedule: WorkSchedule;
  coverEmoji?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventType =
  | "activity"
  | "food"
  | "free_time"
  | "note"
  | "work_session"
  | "errand"
  | "other";

export interface TimelineEvent {
  id: ID;
  tripId: ID;
  date: ISODate;
  type: EventType;
  title: string;
  startTime?: HHmm;
  endTime?: HHmm;
  location?: string;
  cost?: number;
  notes?: string;
  /** Manual order for flexible (untimed) items within a day. */
  order: number;
  /** User acknowledged that this overlaps work and chose to keep it. */
  keepDespiteWork?: boolean;
  booking?: BookingInfo;
}

/** Kept for API symmetry with the brief: an Activity is a TimelineEvent of type activity. */
export type Activity = TimelineEvent & { type: "activity" };

export type BookingStatus = "confirmed" | "pending" | "need_to_book" | "cancelled";
/** Derived from linked expenses — never stored. */
export type PaymentStatus = "paid" | "partial" | "unpaid" | "free";

export interface BookingInfo {
  status: BookingStatus;
  platform?: string;
  reference?: string;
  /** Book-by or cancel-by date, depending on status. */
  deadline?: ISODate;
  deadlineLabel?: string;
}

export type TransportMode =
  | "bus"
  | "train"
  | "flight"
  | "cab"
  | "auto"
  | "ferry"
  | "metro"
  | "scooter"
  | "walk"
  | "other";

export interface TransportLeg {
  id: ID;
  mode: TransportMode;
  from: string;
  to: string;
  departDate: ISODate;
  departTime: HHmm;
  arriveDate: ISODate;
  arriveTime: HHmm;
  operator?: string;
  number?: string;
  cost: number;
  notes?: string;
}

export interface CostLine {
  id: ID;
  label: string;
  amount: number;
}

/** A booked or planned journey between two places — possibly multi-leg. */
export interface Transport {
  id: ID;
  tripId: ID;
  from: string;
  to: string;
  legs: TransportLeg[];
  extras: CostLine[];
  booking: BookingInfo;
  decisionId?: ID;
  notes?: string;
}

export interface TransportOption {
  id: ID;
  label: string;
  legs: TransportLeg[];
  extras: CostLine[];
  /** 1 (rough) – 5 (very comfortable). */
  comfort: number;
  notes?: string;
}

export type DecisionPriority = "money" | "balanced" | "time";

export interface TransportDecision {
  id: ID;
  tripId: ID;
  title: string;
  from: string;
  to: string;
  date: ISODate;
  priority: DecisionPriority;
  options: TransportOption[];
  chosenOptionId?: ID;
  transportId?: ID;
}

export interface Accommodation {
  id: ID;
  tripId: ID;
  property: string;
  city: string;
  checkIn: ISODate;
  checkOut: ISODate;
  checkInTime?: HHmm;
  checkOutTime?: HHmm;
  pricePerNight: number;
  booking: BookingInfo;
  wifi?: { available: boolean; speedMbps?: number; network?: string; password?: string };
  workspace?: boolean;
  laundry?: boolean;
  address?: string;
  mapUrl?: string;
  notes?: string;
}

/** A standalone booking that is not a stay, transport or activity (e.g. exam fee, tour). */
export interface Booking {
  id: ID;
  tripId: ID;
  title: string;
  kind: "activity" | "other";
  date: ISODate;
  endDate?: ISODate;
  location?: string;
  price: number;
  booking: BookingInfo;
  notes?: string;
}

export interface Exam {
  id: ID;
  tripId: ID;
  subject: string;
  date: ISODate;
  startTime: HHmm;
  endTime: HHmm;
  venue?: string;
  notes?: string;
}

export type PaymentMethod = "cash" | "upi" | "debit_card" | "credit_card" | "other";

export interface Expense {
  id: ID;
  tripId: ID;
  amount: number;
  categoryId: ID;
  merchant?: string;
  location?: string;
  date: ISODate;
  time?: HHmm;
  paymentMethod: PaymentMethod;
  phaseId?: ID;
  notes?: string;
  receiptName?: string;
  /** Link to the thing this payment was for (keeps bookings and money in sync). */
  linked?: { kind: "accommodation" | "transport" | "event" | "booking" | "checklist"; id: ID };
  createdAt: string;
}

export type BudgetCategoryKind = "daily" | "fixed";

/** Semantic role so bookings and shopping can be attributed to the right category. */
export type CategoryRole =
  | "accommodation"
  | "long_transport"
  | "local_transport"
  | "food"
  | "activities"
  | "cafes"
  | "scooter"
  | "fuel"
  | "shopping"
  | "exam"
  | "emergency"
  | "misc";

export interface BudgetCategory {
  id: ID;
  tripId: ID;
  name: string;
  icon: string; // lucide icon key
  planned: number;
  /** daily = spent day-to-day (food, cafés); fixed = big-ticket, usually pre-booked. */
  kind: BudgetCategoryKind;
  role?: CategoryRole;
  order: number;
  archived?: boolean;
}

export interface Budget {
  tripId: ID;
  total: number;
  categories: BudgetCategory[];
}

export type ChecklistSection =
  | "Documents"
  | "Work"
  | "Camera"
  | "Clothing"
  | "Toiletries"
  | "Travel"
  | "Exam"
  | "Money"
  | (string & {});

export interface ChecklistItem {
  id: ID;
  checklistId: ID;
  section: ChecklistSection;
  name: string;
  quantity: number;
  packed: boolean;
  needToBuy: boolean;
  estimatedCost?: number;
  actualCost?: number;
  includeInBudget?: boolean;
  expenseId?: ID;
  notes?: string;
  order: number;
}

export interface Checklist {
  id: ID;
  tripId: ID | null; // null = reusable template
  name: string;
  isTemplate: boolean;
}

export interface Settings {
  activeTripId: ID | null;
  /** When set, the app treats this as "today" (useful for demo / planning). */
  simulatedDate: ISODate | null;
  simulatedTime: HHmm | null;
  theme: "system" | "light" | "dark";
}

/** Complete persisted state — the unit a repository loads and saves. */
export interface AppData {
  version: number;
  user: User;
  settings: Settings;
  trips: Trip[];
  phases: TripPhase[];
  destinations: Destination[];
  events: TimelineEvent[];
  transports: Transport[];
  decisions: TransportDecision[];
  accommodations: Accommodation[];
  bookings: Booking[];
  exams: Exam[];
  expenses: Expense[];
  categories: BudgetCategory[];
  checklists: Checklist[];
  checklistItems: ChecklistItem[];
}

export type CollectionKey = Exclude<keyof AppData, "version" | "user" | "settings">;
