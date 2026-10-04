import type { Metadata } from "next";
import { Suspense } from "react";
import { ChecklistScreen } from "@/components/checklist/checklist-screen";

export const metadata: Metadata = { title: "Checklist" };

export default function Page() {
  return (
    <Suspense>
      <ChecklistScreen />
    </Suspense>
  );
}
