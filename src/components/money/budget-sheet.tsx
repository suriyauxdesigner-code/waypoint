"use client";

import * as React from "react";
import { toast } from "sonner";
import { Archive, Plus } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input, MoneyInput, Select } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CATEGORY_ICON_KEYS, CategoryIcon } from "@/components/common/icons";
import { useActiveTrip, useData } from "@/lib/store/hooks";
import { archiveCategory, saveCategory, updateTotalBudget } from "@/lib/store/actions";
import { categoriesForTrip } from "@/lib/calc/budget";
import { currencySymbol, money } from "@/lib/format";
import type { BudgetCategoryKind } from "@/lib/types";
import { sum, uid } from "@/lib/utils";

interface Draft {
  id: string;
  isNew?: boolean;
  name: string;
  icon: string;
  planned: string;
  kind: BudgetCategoryKind;
  archived?: boolean;
}

export function BudgetSheet({ onClose }: { onClose: () => void }) {
  const data = useData();
  const trip = useActiveTrip()!;
  const [open, setOpen] = React.useState(true);
  const [total, setTotal] = React.useState(String(trip.totalBudget));
  const [cats, setCats] = React.useState<Draft[]>(
    categoriesForTrip(data, trip.id).map((c) => ({ id: c.id, name: c.name, icon: c.icon, planned: String(c.planned), kind: c.kind })),
  );
  const [error, setError] = React.useState("");
  const symbol = currencySymbol(trip.currency);
  const active = cats.filter((c) => !c.archived);
  const allocated = sum(active, (c) => Number(c.planned) || 0);
  const totalN = Number(total) || 0;
  const diff = totalN - allocated;

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) setTimeout(onClose, 200);
  };

  const save = () => {
    if (!totalN || totalN <= 0) return setError("Enter a trip budget above 0");
    if (active.some((c) => !c.name.trim())) return setError("Every category needs a name");
    if (active.some((c) => Number.isNaN(Number(c.planned)) || Number(c.planned) < 0)) return setError("Planned amounts must be 0 or more");
    updateTotalBudget(trip.id, Math.round(totalN));
    const existing = categoriesForTrip(data, trip.id);
    cats.forEach((c, i) => {
      if (c.archived) {
        if (!c.isNew) archiveCategory(c.id);
        return;
      }
      const prev = existing.find((e) => e.id === c.id);
      saveCategory({ ...(prev ?? {}), id: c.isNew ? undefined : c.id, tripId: trip.id, name: c.name.trim(), icon: c.icon, planned: Math.round(Number(c.planned) || 0), kind: c.kind, role: prev?.role, order: i });
    });
    toast.success("Budget updated");
    close(false);
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={close}
      wide
      title="Budget"
      description="Set the trip total and plan how it splits across categories."
      footer={
        <Button size="lg" className="lg:h-10" onClick={save}>
          Save budget
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-5">
        <Field label="Trip budget" htmlFor="b-total" error={error}>
          <MoneyInput id="b-total" symbol={symbol} value={total} onChange={(e) => setTotal(e.target.value)} className="text-[18px] font-semibold lg:text-[16px]" />
        </Field>
        <p className={diff === 0 ? "text-[13px] text-positive" : "text-[13px] text-muted-foreground"}>
          {diff === 0
            ? "Every rupee is planned."
            : diff > 0
              ? `${money(diff, trip.currency)} not yet assigned to a category.`
              : `Categories add up to ${money(-diff, trip.currency)} more than the trip budget.`}
        </p>
        <div className="divide-y rounded-lg border">
          {active.map((c) => (
            <div key={c.id} className="grid grid-cols-[auto_1fr_110px_auto] items-center gap-2 px-2.5 py-2 sm:grid-cols-[auto_1fr_120px_110px_auto]">
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={`Icon for ${c.name || "category"}`} className="grid size-10 place-content-center rounded-md border bg-surface hover:bg-muted">
                  <CategoryIcon icon={c.icon} className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="grid min-w-0 grid-cols-5 gap-0.5">
                  {CATEGORY_ICON_KEYS.map((k) => (
                    <DropdownMenuItem key={k} className="justify-center px-0" onSelect={() => setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, icon: k } : x)))}>
                      <CategoryIcon icon={k} />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Input aria-label="Category name" placeholder="Category" value={c.name} onChange={(e) => setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))} />
              <Select
                aria-label={`${c.name} type`}
                className="hidden sm:block"
                value={c.kind}
                onChange={(e) => setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, kind: e.target.value as BudgetCategoryKind } : x)))}
              >
                <option value="daily">Day-to-day</option>
                <option value="fixed">Big-ticket</option>
              </Select>
              <MoneyInput aria-label={`${c.name} planned`} symbol={symbol} value={c.planned} onChange={(e) => setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, planned: e.target.value } : x)))} />
              <Button variant="ghost" size="icon-sm" aria-label={`Archive ${c.name}`} onClick={() => setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, archived: true } : x)))}>
                <Archive />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          onClick={() => setCats((cs) => [...cs, { id: uid("cat"), isNew: true, name: "", icon: "circle-ellipsis", planned: "0", kind: "daily" }])}
        >
          <Plus /> Add category
        </Button>
        <p className="text-[12px] text-subtle-foreground">Archived categories keep their past expenses — they just stop appearing in pickers.</p>
      </div>
    </ResponsiveSheet>
  );
}
