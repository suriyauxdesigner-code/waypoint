import type { Metadata } from "next";
import { Suspense } from "react";
import { TripScreen } from "@/components/trip/trip-screen";

export const metadata: Metadata = { title: "Trip" };

export default function TripPage() {
  return (
    <Suspense>
      <TripScreen />
    </Suspense>
  );
}
