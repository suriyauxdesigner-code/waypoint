import type { Metadata } from "next";
import { Suspense } from "react";
import { DecisionScreen } from "@/components/transport/decision-screen";

export const metadata: Metadata = { title: "Compare transport" };

export default function TransportDecisionPage() {
  return (
    <Suspense>
      <DecisionScreen />
    </Suspense>
  );
}
