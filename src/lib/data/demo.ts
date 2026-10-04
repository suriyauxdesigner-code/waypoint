import type {
  Accommodation,
  AppData,
  BudgetCategory,
  CategoryRole,
  ChecklistItem,
  Destination,
  EventType,
  Exam,
  Expense,
  PaymentMethod,
  TimelineEvent,
  Transport,
  TransportDecision,
  TripPhase,
  Trip,
} from "@/lib/types";
import { DEFAULT_CATEGORY_TEMPLATE } from "./defaults";

export const DATA_VERSION = 1;
export const DEMO_TRIP_ID = "trip_kerala_jaipur";
/** The demo is narrated from Friday 4 December, a Munnar workday. */
export const DEMO_TODAY = "2026-12-04";

const T = DEMO_TRIP_ID;
const created = "2026-11-20T09:00:00.000Z";

const trip: Trip = {
  id: T,
  name: "Kerala Backpacking + Jaipur Exams",
  startDate: "2026-11-29",
  endDate: "2026-12-27",
  purpose: "mixed",
  currency: "INR",
  totalBudget: 30000,
  coverEmoji: "🌴",
  workSchedule: {
    enabled: true,
    days: [1, 2, 3, 4, 5],
    start: "10:00",
    end: "18:00",
    timezoneLabel: "IST",
    protectWorkHours: true,
    preferTransportOutsideWork: true,
    showWifiInfo: true,
    showWorkspaceStays: true,
    // Leave on weekday exam days
    daysOff: ["2026-12-15", "2026-12-17", "2026-12-22", "2026-12-24"],
  },
  notes: "Backpack Kerala while working remotely, then semester exams in Jaipur.",
  createdAt: created,
  updatedAt: created,
};

const phases: TripPhase[] = [
  {
    id: "phase_kerala",
    tripId: T,
    name: "Kerala",
    startDate: "2026-11-29",
    endDate: "2026-12-12",
    location: "Kerala",
    purposes: ["backpacking", "remote_work"],
    budget: 18000,
    notes: "Kochi → Munnar → Varkala → Thiruvananthapuram. Work weekdays, explore mornings and evenings.",
    order: 0,
  },
  {
    id: "phase_jaipur",
    tripId: T,
    name: "Jaipur",
    startDate: "2026-12-12",
    endDate: "2026-12-27",
    location: "Jaipur",
    purposes: ["exams", "remote_work"],
    budget: 15000,
    notes: "Semester exams. Leave from work on weekday exam days.",
    order: 1,
  },
];

const destinations: Destination[] = [
  { id: "dest_blr", tripId: T, name: "Bangalore", region: "Karnataka", lat: 12.9716, lng: 77.5946, arriveDate: "2026-11-29", departDate: "2026-11-29", order: 0 },
  { id: "dest_kochi", tripId: T, name: "Kochi", region: "Kerala", lat: 9.9312, lng: 76.2673, arriveDate: "2026-11-30", departDate: "2026-12-03", order: 1 },
  { id: "dest_munnar", tripId: T, name: "Munnar", region: "Kerala", lat: 10.0889, lng: 77.0595, arriveDate: "2026-12-03", departDate: "2026-12-05", order: 2 },
  { id: "dest_varkala", tripId: T, name: "Varkala", region: "Kerala", lat: 8.7379, lng: 76.7163, arriveDate: "2026-12-05", departDate: "2026-12-09", order: 3 },
  { id: "dest_tvm", tripId: T, name: "Thiruvananthapuram", region: "Kerala", lat: 8.5241, lng: 76.9366, arriveDate: "2026-12-09", departDate: "2026-12-12", order: 4 },
  { id: "dest_jaipur", tripId: T, name: "Jaipur", region: "Rajasthan", lat: 26.9124, lng: 75.7873, arriveDate: "2026-12-12", departDate: "2026-12-27", order: 5 },
];

const accommodations: Accommodation[] = [
  {
    id: "acc_kochi",
    tripId: T,
    property: "Fort Kochi Backpackers",
    city: "Kochi",
    checkIn: "2026-11-30",
    checkOut: "2026-12-03",
    checkInTime: "08:00",
    checkOutTime: "05:15",
    pricePerNight: 550,
    booking: { status: "confirmed", platform: "Hostelworld", reference: "HW-48211907" },
    wifi: { available: true, speedMbps: 45, network: "FKB_Guest" },
    workspace: true,
    laundry: true,
    address: "Burgher St, Fort Kochi, Kerala 682001",
    notes: "Early check-in arranged after the overnight bus.",
  },
  {
    id: "acc_munnar",
    tripId: T,
    property: "Tea Valley Homestay",
    city: "Munnar",
    checkIn: "2026-12-03",
    checkOut: "2026-12-05",
    checkInTime: "09:50",
    checkOutTime: "06:45",
    pricePerNight: 900,
    booking: { status: "confirmed", platform: "Direct (WhatsApp)", reference: "Paid via UPI" },
    wifi: { available: true, speedMbps: 18, network: "TeaValley_4G", password: "chai2026" },
    workspace: true,
    laundry: false,
    address: "Chithirapuram Rd, Pallivasal, Munnar, Kerala 685565",
    notes: "Hosts serve breakfast at 8:30. Wi-Fi drops in heavy rain — keep a hotspot ready.",
  },
  {
    id: "acc_varkala",
    tripId: T,
    property: "Varkala Hostel",
    city: "Varkala",
    checkIn: "2026-12-05",
    checkOut: "2026-12-09",
    checkInTime: "16:15",
    checkOutTime: "11:00",
    pricePerNight: 600,
    booking: { status: "confirmed", platform: "Booking.com", reference: "4419 207 553", deadline: "2026-12-03", deadlineLabel: "Free cancellation until" },
    wifi: { available: true, speedMbps: 60, network: "CliffHouse_Cowork" },
    workspace: true,
    laundry: true,
    address: "North Cliff, Varkala, Kerala 695141",
    notes: "Rooftop co-working deck. Quiet hours 10–6 in the work room.",
  },
  {
    id: "acc_tvm",
    tripId: T,
    property: "Kovalam Road Guesthouse",
    city: "Thiruvananthapuram",
    checkIn: "2026-12-09",
    checkOut: "2026-12-12",
    checkInTime: "22:00",
    checkOutTime: "11:00",
    pricePerNight: 600,
    booking: { status: "pending", platform: "Airbnb", reference: "Request sent", deadline: "2026-12-06", deadlineLabel: "Host replies by" },
    wifi: { available: true, speedMbps: 30 },
    workspace: false,
    laundry: true,
    address: "Thampanoor, Thiruvananthapuram, Kerala 695001",
    notes: "Late check-in requested (train arrives 21:35). Pay at property.",
  },
  {
    id: "acc_jaipur",
    tripId: T,
    property: "Campus guest house",
    city: "Jaipur",
    checkIn: "2026-12-12",
    checkOut: "2026-12-27",
    checkInTime: "19:00",
    checkOutTime: "10:00",
    pricePerNight: 200,
    booking: { status: "need_to_book", deadline: "2026-12-08", deadlineLabel: "Book before" },
    wifi: { available: false },
    workspace: false,
    notes: "Student rate ₹200/night — request via the hostel office. Fallback: PG in Malviya Nagar (~₹450/night). Needs a desk + reliable Wi-Fi.",
  },
];

const transports: Transport[] = [
  {
    id: "tr_blr_kochi",
    tripId: T,
    from: "Bangalore",
    to: "Kochi",
    legs: [
      { id: "leg_blr_kochi", mode: "bus", from: "Bangalore", to: "Kochi", departDate: "2026-11-29", departTime: "21:30", arriveDate: "2026-11-30", arriveTime: "07:15", operator: "KSRTC Swift", number: "Volvo Multi-axle", cost: 1150 },
    ],
    extras: [],
    booking: { status: "confirmed", platform: "KSRTC", reference: "KS2911-5532" },
  },
  {
    id: "tr_kochi_munnar",
    tripId: T,
    from: "Kochi",
    to: "Munnar",
    legs: [
      { id: "leg_kochi_munnar", mode: "bus", from: "Ernakulam", to: "Munnar", departDate: "2026-12-03", departTime: "05:45", arriveDate: "2026-12-03", arriveTime: "09:40", operator: "KSRTC", number: "Fast Passenger", cost: 230 },
    ],
    extras: [],
    booking: { status: "confirmed", platform: "KSRTC", reference: "Bought at stand" },
  },
  {
    id: "tr_munnar_varkala",
    tripId: T,
    from: "Munnar",
    to: "Varkala",
    legs: [
      { id: "leg_mv_1", mode: "bus", from: "Munnar", to: "Ernakulam", departDate: "2026-12-05", departTime: "07:10", arriveDate: "2026-12-05", arriveTime: "11:00", operator: "KSRTC", cost: 235 },
      { id: "leg_mv_2", mode: "train", from: "Ernakulam", to: "Varkala", departDate: "2026-12-05", departTime: "11:40", arriveDate: "2026-12-05", arriveTime: "15:20", operator: "Kerala Express", number: "12626 · 2S", cost: 245 },
    ],
    extras: [],
    booking: { status: "confirmed", platform: "IRCTC + KSRTC", reference: "PNR 4218 330 917" },
  },
  {
    id: "tr_varkala_tvm",
    tripId: T,
    from: "Varkala",
    to: "Thiruvananthapuram",
    legs: [
      { id: "leg_vt", mode: "train", from: "Varkala", to: "Thiruvananthapuram", departDate: "2026-12-09", departTime: "20:40", arriveDate: "2026-12-09", arriveTime: "21:35", operator: "Malabar Express", number: "16630 · SL", cost: 65 },
    ],
    extras: [],
    booking: { status: "confirmed", platform: "IRCTC", reference: "PNR 4290 118 602" },
  },
];

const decisions: TransportDecision[] = [
  {
    id: "dec_kerala_jaipur",
    tripId: T,
    title: "Kerala → Jaipur",
    from: "Thiruvananthapuram",
    to: "Jaipur",
    date: "2026-12-12",
    priority: "balanced",
    options: [
      {
        id: "opt_train",
        label: "Train",
        comfort: 2,
        legs: [
          { id: "o1l1", mode: "train", from: "Thiruvananthapuram", to: "Jaipur", departDate: "2026-12-12", departTime: "05:15", arriveDate: "2026-12-13", arriveTime: "20:15", operator: "Kochuveli–Jaipur Express", number: "3A", cost: 2400 },
        ],
        extras: [
          { id: "o1e1", label: "Station transport", amount: 150 },
          { id: "o1e2", label: "Food on board", amount: 500 },
        ],
        notes: "Two nights on board. Patchy network through central India — download study notes offline.",
      },
      {
        id: "opt_flight",
        label: "Flight",
        comfort: 4,
        legs: [
          { id: "o2l1", mode: "flight", from: "Thiruvananthapuram", to: "Jaipur", departDate: "2026-12-12", departTime: "13:10", arriveDate: "2026-12-12", arriveTime: "18:30", operator: "1 stop via Mumbai", cost: 5400 },
        ],
        extras: [
          { id: "o2e1", label: "Airport transport", amount: 400 },
          { id: "o2e2", label: "Checked baggage", amount: 300 },
        ],
      },
      {
        id: "opt_train_flight",
        label: "Train + Flight",
        comfort: 3,
        legs: [
          { id: "o3l1", mode: "train", from: "Thiruvananthapuram", to: "Chennai", departDate: "2026-12-12", departTime: "15:00", arriveDate: "2026-12-13", arriveTime: "07:00", operator: "Chennai Mail", number: "SL", cost: 780 },
          { id: "o3l2", mode: "flight", from: "Chennai", to: "Jaipur", departDate: "2026-12-13", departTime: "10:05", arriveDate: "2026-12-13", arriveTime: "12:55", operator: "Non-stop", cost: 3300 },
        ],
        extras: [
          { id: "o3e1", label: "Station + airport transfers", amount: 350 },
          { id: "o3e2", label: "Food", amount: 250 },
        ],
      },
      {
        id: "opt_bus_flight",
        label: "Bus + Flight",
        comfort: 3,
        legs: [
          { id: "o4l1", mode: "bus", from: "Thiruvananthapuram", to: "Kochi", departDate: "2026-12-12", departTime: "06:00", arriveDate: "2026-12-12", arriveTime: "11:30", operator: "KSRTC Swift", cost: 350 },
          { id: "o4l2", mode: "flight", from: "Kochi", to: "Jaipur", departDate: "2026-12-12", departTime: "14:20", arriveDate: "2026-12-12", arriveTime: "17:20", operator: "Non-stop", cost: 4200 },
        ],
        extras: [
          { id: "o4e1", label: "Airport transfer", amount: 300 },
          { id: "o4e2", label: "Food", amount: 200 },
        ],
      },
    ],
  },
];

let order = 0;
function ev(
  date: string,
  type: EventType,
  title: string,
  start?: string,
  end?: string,
  extra: Partial<TimelineEvent> = {},
): TimelineEvent {
  order += 1;
  return {
    id: `ev_${date.slice(5).replace("-", "")}_${order}`,
    tripId: T,
    date,
    type,
    title,
    startTime: start,
    endTime: end,
    order,
    ...extra,
  };
}

const events: TimelineEvent[] = [
  ev("2026-11-29", "errand", "Pack & leave for Majestic bus stand", "18:30"),
  ev("2026-11-29", "food", "Dinner near Majestic", "19:45", undefined, { location: "Bangalore", cost: 160 }),
  ev("2026-11-30", "activity", "Fort Kochi beach & Chinese fishing nets", "18:30", "20:00", { location: "Fort Kochi" }),
  ev("2026-11-30", "food", "Dinner", "20:15", undefined, { location: "Fort Kochi" }),
  ev("2026-12-01", "activity", "Walk to Mattancherry Palace", "07:00", "08:30", { location: "Mattancherry" }),
  ev("2026-12-01", "activity", "Kathakali performance", "18:00", "19:30", { id: "ev_kathakali", location: "Kerala Kathakali Centre", cost: 450, booking: { status: "confirmed", platform: "At venue", reference: "Seat C-14" } }),
  ev("2026-12-02", "activity", "Jew Town & spice market", "07:30", "09:00", { location: "Mattancherry" }),
  ev("2026-12-02", "food", "Dinner", "19:00", undefined, { location: "Fort Kochi" }),
  ev("2026-12-03", "activity", "Tea Museum", "18:15", "19:15", { location: "Munnar", cost: 125 }),
  // Today — Friday 4 Dec, Munnar
  ev("2026-12-04", "activity", "Tea estate walk", "06:30", "08:00", { location: "Lockhart Gap", notes: "Start from the homestay gate; carry a light jacket." }),
  ev("2026-12-04", "food", "Breakfast", "08:30", undefined, { location: "Tea Valley Homestay" }),
  ev("2026-12-04", "activity", "Explore Munnar", "18:30", "20:00", { location: "Munnar town", notes: "Scooter is with you till tomorrow morning." }),
  ev("2026-12-04", "food", "Dinner", "20:30", undefined, { location: "Saravana Bhavan, Munnar" }),
  ev("2026-12-04", "errand", "Refill water bottles for tomorrow's bus", undefined, undefined),
  ev("2026-12-05", "activity", "Varkala Cliff at sunset", "18:00", "19:30", { location: "North Cliff" }),
  ev("2026-12-06", "activity", "Surf lesson", "07:00", "09:00", { id: "ev_surf", location: "Varkala Beach", cost: 1200, booking: { status: "pending", platform: "Soul & Surf (WhatsApp)", deadline: "2026-12-05", deadlineLabel: "Confirm by" } }),
  ev("2026-12-06", "free_time", "Beach day", "12:00", "17:00", { location: "Papanasam Beach" }),
  ev("2026-12-06", "errand", "Find a work café for the week", undefined, undefined, { location: "North Cliff" }),
  ev("2026-12-07", "activity", "Kayaking at Kappil backwaters", "14:40", "18:00", { id: "ev_kayak", location: "Kappil Lake", cost: 700, booking: { status: "need_to_book", deadline: "2026-12-06", deadlineLabel: "Book by" } }),
  ev("2026-12-08", "activity", "Black Beach walk", "18:30", "19:30", { location: "Varkala" }),
  ev("2026-12-08", "errand", "Book Jaipur stay", undefined, undefined),
  ev("2026-12-09", "work_session", "Work from Café Del Mar", "11:30", undefined, { location: "North Cliff", notes: "Bags stored at the hostel desk." }),
  ev("2026-12-10", "activity", "Padmanabhaswamy Temple", "07:00", "08:30", { location: "East Fort", notes: "Dress code: mundu / saree. No phones inside." }),
  ev("2026-12-11", "activity", "Shangumugham Beach sunset", "18:30", "19:30", { location: "Shangumugham" }),
  ev("2026-12-13", "errand", "Groceries & local SIM top-up", "17:00", undefined, { location: "Malviya Nagar" }),
  ev("2026-12-14", "work_session", "Revision: Design Research Methods", "19:00", "22:00"),
  ev("2026-12-16", "work_session", "Revision: Interaction Design", "19:00", "22:00"),
  ev("2026-12-20", "activity", "Amber Fort", "08:00", "11:30", { location: "Amer", cost: 100 }),
  ev("2026-12-21", "work_session", "Revision: Information Architecture", "19:00", "22:00"),
  ev("2026-12-26", "activity", "Hawa Mahal & Johari Bazaar", "16:00", "19:30", { location: "Old City" }),
  ev("2026-12-27", "note", "Trip ends — head home", "10:30"),
];

const exams: Exam[] = [
  { id: "exam_1", tripId: T, subject: "Design Research Methods", date: "2026-12-15", startTime: "10:00", endTime: "13:00", venue: "Campus · Hall B" },
  { id: "exam_2", tripId: T, subject: "Interaction Design", date: "2026-12-17", startTime: "10:00", endTime: "13:00", venue: "Campus · Hall B" },
  { id: "exam_3", tripId: T, subject: "Visual Communication", date: "2026-12-19", startTime: "10:00", endTime: "13:00", venue: "Campus · Studio 2" },
  { id: "exam_4", tripId: T, subject: "Information Architecture", date: "2026-12-22", startTime: "10:00", endTime: "13:00", venue: "Campus · Hall B" },
  { id: "exam_5", tripId: T, subject: "Design Management", date: "2026-12-24", startTime: "14:00", endTime: "17:00", venue: "Campus · Hall A" },
];

const plannedByRole: Record<CategoryRole, number> = {
  accommodation: 10500,
  long_transport: 5000,
  local_transport: 1000,
  food: 7500,
  activities: 2000,
  cafes: 900,
  scooter: 900,
  fuel: 300,
  shopping: 500,
  exam: 500,
  emergency: 900,
  misc: 0,
};

const categories: BudgetCategory[] = DEFAULT_CATEGORY_TEMPLATE.map((c, i) => ({
  id: `cat_${c.role}`,
  tripId: T,
  name: c.name,
  icon: c.icon,
  kind: c.kind,
  role: c.role,
  planned: plannedByRole[c.role],
  order: i,
}));

let exSeq = 0;
function ex(
  date: string,
  time: string,
  role: CategoryRole,
  amount: number,
  merchant: string,
  location: string,
  paymentMethod: PaymentMethod,
  extra: Partial<Expense> = {},
): Expense {
  exSeq += 1;
  return {
    id: `exp_${String(exSeq).padStart(3, "0")}`,
    tripId: T,
    amount,
    categoryId: `cat_${role}`,
    merchant,
    location,
    date,
    time,
    paymentMethod,
    phaseId: "phase_kerala",
    createdAt: `${date}T${time}:00.000Z`,
    ...extra,
  };
}

const expenses: Expense[] = [
  // 29 Nov — Bangalore
  ex("2026-11-29", "10:20", "exam", 120, "Hall ticket printout & stationery", "Bangalore", "upi"),
  ex("2026-11-29", "12:05", "accommodation", 2400, "Varkala Hostel (4 nights)", "Booking.com", "credit_card", { linked: { kind: "accommodation", id: "acc_varkala" }, notes: "Prepaid to lock the rate." }),
  ex("2026-11-29", "18:40", "long_transport", 1150, "KSRTC Swift · Bangalore → Kochi", "Bangalore", "upi", { linked: { kind: "transport", id: "tr_blr_kochi" } }),
  ex("2026-11-29", "19:50", "food", 160, "Dinner near Majestic", "Bangalore", "upi"),
  // 30 Nov — Kochi
  ex("2026-11-30", "07:40", "local_transport", 180, "Auto to Fort Kochi", "Kochi", "cash"),
  ex("2026-11-30", "08:10", "accommodation", 1650, "Fort Kochi Backpackers (3 nights)", "Kochi", "debit_card", { linked: { kind: "accommodation", id: "acc_kochi" } }),
  ex("2026-11-30", "09:00", "food", 70, "Appam & stew", "Fort Kochi", "cash"),
  ex("2026-11-30", "09:30", "misc", 299, "Jio recharge · 28 days", "Kochi", "upi"),
  ex("2026-11-30", "13:30", "food", 160, "Fish thali", "Fort Kochi", "upi"),
  ex("2026-11-30", "16:10", "cafes", 150, "Cold coffee & banana bread", "Princess St", "upi"),
  // 1 Dec
  ex("2026-12-01", "08:45", "food", 60, "Puttu & kadala", "Mattancherry", "cash"),
  ex("2026-12-01", "13:15", "food", 140, "Veg meals", "Fort Kochi", "upi"),
  ex("2026-12-01", "17:20", "local_transport", 40, "Ferry · Fort Kochi ↔ Ernakulam", "Kochi", "cash"),
  ex("2026-12-01", "17:45", "activities", 450, "Kathakali performance", "Kerala Kathakali Centre", "cash", { linked: { kind: "event", id: "ev_kathakali" } }),
  // 2 Dec
  ex("2026-12-02", "09:10", "shopping", 181, "Cardamom & pepper", "Jew Town", "upi"),
  ex("2026-12-02", "13:00", "food", 150, "Lunch", "Mattancherry", "upi"),
  ex("2026-12-02", "15:30", "cafes", 180, "Café · Jew Town", "Mattancherry", "upi"),
  ex("2026-12-02", "18:20", "local_transport", 80, "Auto to Mattancherry", "Kochi", "cash"),
  ex("2026-12-02", "18:50", "long_transport", 480, "Munnar → Varkala (bus + train)", "IRCTC", "upi", { linked: { kind: "transport", id: "tr_munnar_varkala" } }),
  ex("2026-12-02", "19:10", "long_transport", 65, "Varkala → Thiruvananthapuram train", "IRCTC", "upi", { linked: { kind: "transport", id: "tr_varkala_tvm" } }),
  ex("2026-12-02", "19:40", "food", 170, "Dinner", "Fort Kochi", "upi"),
  // 3 Dec — to Munnar
  ex("2026-12-03", "05:20", "local_transport", 160, "Auto to Ernakulam bus stand", "Kochi", "cash"),
  ex("2026-12-03", "05:40", "long_transport", 230, "KSRTC · Ernakulam → Munnar", "Ernakulam", "cash", { linked: { kind: "transport", id: "tr_kochi_munnar" } }),
  ex("2026-12-03", "07:30", "food", 40, "Tea & vada at Adimali", "Adimali", "cash"),
  ex("2026-12-03", "09:55", "accommodation", 1800, "Tea Valley Homestay (2 nights)", "Munnar", "upi", { linked: { kind: "accommodation", id: "acc_munnar" } }),
  ex("2026-12-03", "18:05", "scooter", 450, "Scooter rental · 2 days", "Munnar", "cash"),
  ex("2026-12-03", "18:10", "fuel", 150, "Petrol", "Munnar", "cash"),
  ex("2026-12-03", "18:15", "activities", 125, "Tea Museum entry", "Munnar", "cash"),
  ex("2026-12-03", "20:30", "food", 100, "Parotta & curry", "Munnar", "cash"),
  // 4 Dec — today
  ex("2026-12-04", "08:40", "food", 120, "Breakfast", "Tea Valley Homestay", "cash"),
  ex("2026-12-04", "09:30", "local_transport", 60, "Bus to Munnar town", "Munnar", "cash"),
  ex("2026-12-04", "13:20", "food", 180, "Lunch · meals", "Munnar", "upi"),
  ex("2026-12-04", "16:00", "cafes", 90, "Coffee", "Munnar", "upi"),
];

const checklistId = "cl_kerala";
let ciOrder = 0;
function ci(section: string, name: string, packed: boolean, extra: Partial<ChecklistItem> = {}): ChecklistItem {
  ciOrder += 1;
  return {
    id: `ci_${String(ciOrder).padStart(3, "0")}`,
    checklistId,
    section,
    name,
    quantity: 1,
    packed,
    needToBuy: false,
    order: ciOrder,
    ...extra,
  };
}

const checklistItems: ChecklistItem[] = [
  ci("Documents", "Aadhaar", true),
  ci("Documents", "College ID", true),
  ci("Documents", "Exam hall ticket", true, { notes: "Printed copy + PDF in Drive" }),
  ci("Documents", "Train / flight tickets", true),
  ci("Documents", "Accommodation bookings", true),
  ci("Work", "Laptop", true),
  ci("Work", "Laptop charger", true),
  ci("Work", "Mouse", false),
  ci("Work", "Earphones", true),
  ci("Work", "Power bank", true, { notes: "20,000 mAh" }),
  ci("Work", "Extension cable", false, { needToBuy: true, estimatedCost: 450, includeInBudget: true }),
  ci("Camera", "Camera", true),
  ci("Camera", "Camera batteries", true, { quantity: 2 }),
  ci("Camera", "Camera charger", false),
  ci("Camera", "Memory cards", true, { quantity: 2 }),
  ci("Camera", "SSD", false),
  ci("Clothing", "T-shirts", true, { quantity: 5 }),
  ci("Clothing", "Shorts", true, { quantity: 2 }),
  ci("Clothing", "Light jacket", true, { notes: "Munnar mornings are cold" }),
  ci("Clothing", "Mundu / temple wear", true),
  ci("Clothing", "Rain jacket", false),
  ci("Clothing", "Warm layer for Jaipur", true),
  ci("Toiletries", "Toothbrush & paste", true),
  ci("Toiletries", "Sunscreen", true),
  ci("Toiletries", "Mosquito repellent", true),
  ci("Toiletries", "Quick-dry towel", true),
  ci("Toiletries", "Lip balm", false),
  ci("Travel", "Backpack", true),
  ci("Travel", "Day bag", true),
  ci("Travel", "Water bottle", true),
  ci("Travel", "Padlock", false, { needToBuy: true, estimatedCost: 200, includeInBudget: false }),
  ci("Travel", "Umbrella", false, { needToBuy: true, estimatedCost: 350, includeInBudget: true }),
  ci("Travel", "Sunglasses", true),
  ci("Exam", "Pens", true, { quantity: 4 }),
  ci("Exam", "Notebook", false, { needToBuy: true, estimatedCost: 80, includeInBudget: false }),
  ci("Exam", "Study materials", true),
  ci("Exam", "Hall ticket", true),
  ci("Exam", "College ID", true),
  ci("Money", "Debit card", true),
  ci("Money", "Credit card", true),
  ci("Money", "Emergency cash", true, { notes: "₹2,000 in the day bag" }),
];

export function buildDemoData(): AppData {
  return {
    version: DATA_VERSION,
    user: { id: "user_suriya", name: "Suriya", homeCurrency: "INR" },
    settings: { activeTripId: T, simulatedDate: DEMO_TODAY, simulatedTime: null, theme: "system" },
    trips: [structuredClone(trip)],
    phases: structuredClone(phases),
    destinations: structuredClone(destinations),
    events: structuredClone(events),
    transports: structuredClone(transports),
    decisions: structuredClone(decisions),
    accommodations: structuredClone(accommodations),
    bookings: [
      {
        id: "bk_exam_form",
        tripId: T,
        title: "Exam re-registration form",
        kind: "other",
        date: "2026-12-10",
        location: "University portal",
        price: 0,
        booking: { status: "pending", deadline: "2026-12-10", deadlineLabel: "Submit by" },
        notes: "Upload hall ticket and fee receipt.",
      },
    ],
    exams: structuredClone(exams),
    expenses: structuredClone(expenses),
    categories: structuredClone(categories),
    checklists: [
      { id: checklistId, tripId: T, name: "Packing", isTemplate: false },
    ],
    checklistItems: structuredClone(checklistItems),
  };
}
