import type { TripPurpose } from "@/lib/types";

export const PURPOSE_LABEL: Record<TripPurpose, string> = {
  backpacking: "Backpacking",
  vacation: "Vacation",
  workation: "Workation",
  remote_work: "Remote Work",
  study: "Study",
  exams: "Exams",
  business: "Business",
  transit: "Transit",
  mixed: "Mixed",
  custom: "Custom",
};

export const PHASE_PURPOSES: TripPurpose[] = [
  "backpacking",
  "vacation",
  "workation",
  "remote_work",
  "study",
  "exams",
  "business",
  "transit",
  "custom",
];

export const TRIP_PURPOSES: TripPurpose[] = ["backpacking", "vacation", "workation", "study", "business", "mixed"];
