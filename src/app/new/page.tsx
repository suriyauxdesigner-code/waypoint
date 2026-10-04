import type { Metadata } from "next";
import { NewTripFlow } from "@/components/onboarding/new-trip-flow";

export const metadata: Metadata = { title: "Plan a trip" };

export default function NewTripPage() {
  return <NewTripFlow />;
}
