import type { Metadata } from "next";
import { Suspense } from "react";
import { MoneyScreen } from "@/components/money/money-screen";

export const metadata: Metadata = { title: "Money" };

export default function Page() {
  return (
    <Suspense>
      <MoneyScreen />
    </Suspense>
  );
}
