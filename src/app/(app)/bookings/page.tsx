import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingsScreen } from "@/components/bookings/bookings-screen";

export const metadata: Metadata = { title: "Bookings" };

export default function Page() {
  return (
    <Suspense>
      <BookingsScreen />
    </Suspense>
  );
}
