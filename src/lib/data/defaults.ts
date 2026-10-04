import type { AppData, BudgetCategoryKind, CategoryRole, ChecklistItem } from "@/lib/types";

export const DEFAULT_CATEGORY_TEMPLATE: {
  role: CategoryRole;
  name: string;
  icon: string;
  kind: BudgetCategoryKind;
  share: number; // default share of budget for new trips
}[] = [
  { role: "accommodation", name: "Accommodation", icon: "bed", kind: "fixed", share: 0.38 },
  { role: "long_transport", name: "Long-distance transport", icon: "train", kind: "fixed", share: 0.17 },
  { role: "local_transport", name: "Local transport", icon: "bus", kind: "daily", share: 0.04 },
  { role: "food", name: "Food", icon: "utensils", kind: "daily", share: 0.22 },
  { role: "activities", name: "Activities", icon: "ticket", kind: "daily", share: 0.05 },
  { role: "cafes", name: "Cafés", icon: "coffee", kind: "daily", share: 0.03 },
  { role: "scooter", name: "Scooter / Bike", icon: "bike", kind: "daily", share: 0.03 },
  { role: "fuel", name: "Fuel", icon: "fuel", kind: "daily", share: 0.01 },
  { role: "shopping", name: "Shopping", icon: "shopping-bag", kind: "daily", share: 0.02 },
  { role: "exam", name: "Exam", icon: "graduation-cap", kind: "fixed", share: 0 },
  { role: "emergency", name: "Emergency", icon: "life-buoy", kind: "fixed", share: 0.05 },
  { role: "misc", name: "Miscellaneous", icon: "circle-ellipsis", kind: "daily", share: 0 },
];

/** Reusable packing template used for new trips (all unpacked). */
export const DEFAULT_CHECKLIST_TEMPLATE: Pick<ChecklistItem, "section" | "name" | "quantity">[] = [
  { section: "Documents", name: "ID card / passport", quantity: 1 },
  { section: "Documents", name: "Tickets", quantity: 1 },
  { section: "Documents", name: "Accommodation bookings", quantity: 1 },
  { section: "Work", name: "Laptop", quantity: 1 },
  { section: "Work", name: "Laptop charger", quantity: 1 },
  { section: "Work", name: "Earphones", quantity: 1 },
  { section: "Work", name: "Power bank", quantity: 1 },
  { section: "Clothing", name: "T-shirts", quantity: 4 },
  { section: "Clothing", name: "Rain jacket", quantity: 1 },
  { section: "Toiletries", name: "Toothbrush & paste", quantity: 1 },
  { section: "Toiletries", name: "Sunscreen", quantity: 1 },
  { section: "Travel", name: "Backpack", quantity: 1 },
  { section: "Travel", name: "Water bottle", quantity: 1 },
  { section: "Travel", name: "Padlock", quantity: 1 },
  { section: "Money", name: "Debit card", quantity: 1 },
  { section: "Money", name: "Emergency cash", quantity: 1 },
];

export function emptyData(): AppData {
  return {
    version: 1,
    user: { id: "user_local", name: "Traveller", homeCurrency: "INR" },
    settings: { activeTripId: null, simulatedDate: null, simulatedTime: null, theme: "system" },
    trips: [],
    phases: [],
    destinations: [],
    events: [],
    transports: [],
    decisions: [],
    accommodations: [],
    bookings: [],
    exams: [],
    expenses: [],
    categories: [],
    checklists: [],
    checklistItems: [],
  };
}
