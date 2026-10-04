import type { ChecklistItem } from "@/lib/types";
import { sum } from "@/lib/utils";

export const DEFAULT_SECTIONS = [
  "Documents",
  "Work",
  "Camera",
  "Clothing",
  "Toiletries",
  "Travel",
  "Exam",
  "Money",
] as const;

export function checklistProgress(items: ChecklistItem[]) {
  const total = items.length;
  const packed = items.filter((i) => i.packed).length;
  return { total, packed, ratio: total ? packed / total : 0 };
}

export function shoppingSummary(items: ChecklistItem[]) {
  const toBuy = items.filter((i) => i.needToBuy && !i.expenseId);
  return {
    count: toBuy.length,
    estimated: sum(toBuy, (i) => (i.estimatedCost ?? 0) * Math.max(1, i.quantity)),
    inBudget: sum(
      toBuy.filter((i) => i.includeInBudget),
      (i) => (i.estimatedCost ?? 0) * Math.max(1, i.quantity),
    ),
  };
}

export function groupBySection(items: ChecklistItem[], sectionOrder: readonly string[] = DEFAULT_SECTIONS) {
  const map = new Map<string, ChecklistItem[]>();
  for (const s of sectionOrder) map.set(s, []);
  for (const i of [...items].sort((a, b) => a.order - b.order)) {
    if (!map.has(i.section)) map.set(i.section, []);
    map.get(i.section)!.push(i);
  }
  return [...map.entries()].filter(([, list]) => list.length > 0);
}
