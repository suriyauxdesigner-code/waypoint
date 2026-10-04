"use client";

import * as React from "react";
import { toast } from "sonner";
import { BookmarkPlus, Copy, MoreHorizontal, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useActiveTrip, useData, useToday } from "@/lib/store/hooks";
import {
  applyTemplate,
  deleteChecklistItem,
  deleteTemplate,
  ensureChecklist,
  markBought,
  saveChecklistAsTemplate,
  saveChecklistItem,
  togglePacked,
} from "@/lib/store/actions";
import { DEFAULT_SECTIONS, checklistProgress, groupBySection, shoppingSummary } from "@/lib/calc/checklist";
import { currencySymbol, money, pct } from "@/lib/format";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Meter } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { Input, MoneyInput, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ChecklistItem, CurrencyCode } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "pack" | "buy";

export function ChecklistScreen() {
  const data = useData();
  const trip = useActiveTrip()!;
  const { today } = useToday();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [editing, setEditing] = React.useState<ChecklistItem | { section: string } | null>(null);
  const [buying, setBuying] = React.useState<ChecklistItem | null>(null);
  const checklist = data.checklists.find((c) => c.tripId === trip.id && !c.isTemplate);
  const templates = data.checklists.filter((c) => c.isTemplate);
  const items = checklist ? data.checklistItems.filter((i) => i.checklistId === checklist.id) : [];
  const progress = checklistProgress(items);
  const shop = shoppingSummary(items);
  const visible = items.filter((i) => (filter === "pack" ? !i.packed : filter === "buy" ? i.needToBuy : true));
  const groups = groupBySection(visible);
  const c = trip.currency;

  const listId = () => checklist?.id ?? ensureChecklist(trip.id);

  return (
    <div>
      <PageHeader
        eyebrow="Checklist"
        title="Checklist"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Checklist options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem
                disabled={!items.length}
                onSelect={() => {
                  saveChecklistAsTemplate(listId(), `${trip.name} packing`);
                  toast.success("Saved as a reusable template");
                }}
              >
                <BookmarkPlus /> Save as template
              </DropdownMenuItem>
              {templates.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Add from template</DropdownMenuLabel>
                  {templates.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onSelect={() => {
                        const n = applyTemplate(t.id, listId());
                        toast.success(n ? `Added ${n} items from “${t.name}”` : "Everything from that template is already here");
                      }}
                    >
                      <Copy /> <span className="truncate">{t.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  {templates.map((t) => (
                    <DropdownMenuItem key={`del-${t.id}`} destructive onSelect={() => { deleteTemplate(t.id); toast("Template deleted"); }}>
                      <Trash2 /> <span className="truncate">Delete “{t.name}”</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <section className="mt-4 lg:mt-6" aria-label="Packing progress">
        <div className="flex items-baseline justify-between">
          <p className="text-[28px] font-semibold tracking-tight tabular">
            {progress.packed} <span className="text-muted-foreground">/ {progress.total}</span>
            <span className="ml-2 text-[14px] font-normal text-muted-foreground">packed</span>
          </p>
          <p className="text-[15px] font-semibold tabular">{pct(progress.ratio)}</p>
        </div>
        <Meter value={progress.ratio} tone={progress.ratio === 1 ? "positive" : "default"} className="mt-3 h-2" label="Packed" />
        {shop.count > 0 && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground">
            <ShoppingBag className="size-4" />
            {shop.count} to buy · about {money(shop.estimated, c)}
            {shop.inBudget > 0 && ` · ${money(shop.inBudget, c)} counted in your budget`}
          </p>
        )}
      </section>

      <div className="sticky top-0 z-10 -mx-4 mt-6 bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All ${items.length}` },
            { value: "pack", label: `To pack ${items.length - progress.packed}` },
            { value: "buy", label: `To buy ${shop.count}` },
          ]}
          className="w-full sm:w-auto"
          ariaLabel="Filter checklist"
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your list is empty"
          description="Start from a template or add the first thing you can’t travel without."
          action={<Button onClick={() => setEditing({ section: "Documents" })}><Plus /> Add item</Button>}
        />
      ) : groups.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-muted-foreground">{filter === "pack" ? "Everything’s packed. Nice." : "Nothing left to buy."}</p>
      ) : (
        <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-x-12">
          {groups.map(([section, list]) => {
            const all = items.filter((i) => i.section === section);
            const done = all.filter((i) => i.packed).length;
            return (
              <section key={section} aria-label={section}>
                <div className="flex items-center justify-between border-b pb-1.5">
                  <h2 className="eyebrow !text-foreground">{section}</h2>
                  <span className="text-[12px] tabular text-muted-foreground">
                    {done}/{all.length}
                  </span>
                </div>
                <ul className="divide-y">
                  {list.map((i) => (
                    <ItemRow key={i.id} item={i} currency={c} onEdit={() => setEditing(i)} onBuy={() => setBuying(i)} />
                  ))}
                </ul>
                <QuickAdd section={section} onAdd={(name) => saveChecklistItem({ checklistId: listId(), section, name, quantity: 1, packed: false, needToBuy: false })} />
              </section>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <Button variant="outline" className="mt-10" onClick={() => setEditing({ section: "" })}>
          <Plus /> Add item to a new section
        </Button>
      )}

      {editing && <ItemSheet initial={editing} checklistId={listId()} currency={c} onClose={() => setEditing(null)} />}
      {buying && <BuySheet item={buying} tripId={trip.id} today={today} currency={c} onClose={() => setBuying(null)} />}
    </div>
  );
}

function ItemRow({ item, currency, onEdit, onBuy }: { item: ChecklistItem; currency: CurrencyCode; onEdit: () => void; onBuy: () => void }) {
  return (
    <li className="flex items-center gap-1">
      <label className="flex min-h-12 cursor-pointer items-center pl-0.5 pr-2.5" aria-label={`${item.packed ? "Unpack" : "Pack"} ${item.name}`}>
        <Checkbox checked={item.packed} onCheckedChange={() => togglePacked(item.id)} className="size-[22px]" />
      </label>
      <button type="button" onClick={onEdit} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[15px] lg:text-[14px]", item.packed && "text-muted-foreground line-through decoration-border-strong")}>
            {item.name}
            {item.quantity > 1 && <span className="ml-1.5 text-[12px] tabular text-muted-foreground">×{item.quantity}</span>}
          </span>
          {item.notes && <span className="block truncate text-[12px] text-subtle-foreground">{item.notes}</span>}
        </span>
        {item.actualCost !== undefined && !item.needToBuy && <span className="text-[12px] tabular text-muted-foreground">{money(item.actualCost, currency)}</span>}
      </button>
      {item.needToBuy && (
        <button type="button" onClick={onBuy} className="shrink-0" aria-label={`Mark ${item.name} as bought`}>
          <Badge tone="warning" className="h-7 px-2.5">
            Buy{item.estimatedCost ? ` · ${money(item.estimatedCost * Math.max(1, item.quantity), currency)}` : ""}
          </Badge>
        </button>
      )}
    </li>
  );
}

function QuickAdd({ section, onAdd }: { section: string; onAdd: (name: string) => void }) {
  const [value, setValue] = React.useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onAdd(value.trim());
        setValue("");
      }}
      className="flex items-center gap-2 pt-1"
    >
      <Plus className="ml-1 size-4 shrink-0 text-subtle-foreground" />
      <input
        aria-label={`Add item to ${section}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Add to ${section}`}
        className="h-10 flex-1 bg-transparent text-[14px] outline-none placeholder:text-subtle-foreground"
      />
      {value && (
        <Button type="submit" size="sm" variant="secondary">
          Add
        </Button>
      )}
    </form>
  );
}

function ItemSheet({
  initial,
  checklistId,
  currency,
  onClose,
}: {
  initial: ChecklistItem | { section: string };
  checklistId: string;
  currency: CurrencyCode;
  onClose: () => void;
}) {
  const existing = "id" in initial ? initial : undefined;
  const [open, setOpen] = React.useState(true);
  const [name, setName] = React.useState(existing?.name ?? "");
  const [section, setSection] = React.useState(existing?.section ?? initial.section);
  const [qty, setQty] = React.useState(String(existing?.quantity ?? 1));
  const [needToBuy, setNeedToBuy] = React.useState(existing?.needToBuy ?? false);
  const [est, setEst] = React.useState(existing?.estimatedCost ? String(existing.estimatedCost) : "");
  const [actual, setActual] = React.useState(existing?.actualCost !== undefined ? String(existing.actualCost) : "");
  const [inBudget, setInBudget] = React.useState(existing?.includeInBudget ?? true);
  const [notes, setNotes] = React.useState(existing?.notes ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) setTimeout(onClose, 200);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name the item";
    if (!section.trim()) errs.section = "Pick or type a section";
    const q = Number(qty);
    if (!Number.isInteger(q) || q < 1 || q > 99) errs.qty = "1–99";
    if (est && (Number.isNaN(Number(est)) || Number(est) < 0)) errs.est = "Invalid";
    if (actual && (Number.isNaN(Number(actual)) || Number(actual) < 0)) errs.actual = "Invalid";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    saveChecklistItem({
      ...(existing ?? {}),
      id: existing?.id,
      checklistId,
      section: section.trim(),
      name: name.trim(),
      quantity: q,
      packed: existing?.packed ?? false,
      needToBuy,
      estimatedCost: est ? Math.round(Number(est)) : undefined,
      actualCost: actual ? Math.round(Number(actual)) : undefined,
      includeInBudget: needToBuy ? inBudget : undefined,
      notes: notes.trim() || undefined,
    });
    toast.success(existing ? "Item updated" : "Item added");
    close(false);
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={close}
      title={existing ? "Edit item" : "Add item"}
      footer={
        <>
          {existing && (
            <Button
              variant="destructive-ghost"
              className="lg:mr-auto lg:flex-none"
              onClick={() => {
                deleteChecklistItem(existing.id);
                toast("Item removed", { action: { label: "Undo", onClick: () => saveChecklistItem(existing) } });
                close(false);
              }}
            >
              <Trash2 /> Delete
            </Button>
          )}
          <Button type="submit" form="ci-form" size="lg" className="lg:h-10">
            Save
          </Button>
        </>
      }
    >
      <form id="ci-form" onSubmit={save} className="grid grid-cols-1 gap-4" noValidate>
        <div className="grid grid-cols-[1fr_88px] gap-3">
          <Field label="Item" htmlFor="ci-name" error={errors.name}>
            <Input id="ci-name" autoFocus={!existing} value={name} aria-invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Qty" htmlFor="ci-qty" error={errors.qty}>
            <Input id="ci-qty" type="number" inputMode="numeric" min={1} max={99} value={qty} aria-invalid={!!errors.qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
        </div>
        <Field label="Section" htmlFor="ci-section" error={errors.section}>
          <Input id="ci-section" list="ci-sections" value={section} aria-invalid={!!errors.section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Documents" />
          <datalist id="ci-sections">
            {DEFAULT_SECTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <div className="rounded-lg border">
          <div className="flex items-center justify-between gap-3 px-3.5 py-3">
            <label htmlFor="ci-buy" className="text-[13px] font-medium">
              Need to buy
              <span className="block text-[12px] font-normal text-muted-foreground">Track it as a planned purchase</span>
            </label>
            <Switch id="ci-buy" checked={needToBuy} onCheckedChange={setNeedToBuy} />
          </div>
          {needToBuy && (
            <div className="grid grid-cols-1 gap-3 border-t px-3.5 py-3">
              <Field label="Estimated cost (each)" htmlFor="ci-est" error={errors.est}>
                <MoneyInput id="ci-est" symbol={currencySymbol(currency)} value={est} onChange={(e) => setEst(e.target.value)} />
              </Field>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="ci-budget" className="text-[13px]">
                  Count it in the trip budget
                  <span className="block text-[12px] text-muted-foreground">Reserved under Shopping until you buy it</span>
                </label>
                <Switch id="ci-budget" checked={inBudget} onCheckedChange={setInBudget} />
              </div>
            </div>
          )}
        </div>
        {!needToBuy && existing?.actualCost !== undefined && (
          <Field label="Actual cost" htmlFor="ci-actual" error={errors.actual}>
            <MoneyInput id="ci-actual" symbol={currencySymbol(currency)} value={actual} onChange={(e) => setActual(e.target.value)} />
          </Field>
        )}
        <Field label="Notes" htmlFor="ci-notes" optional>
          <Textarea id="ci-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </form>
    </ResponsiveSheet>
  );
}

function BuySheet({ item, tripId, today, currency, onClose }: { item: ChecklistItem; tripId: string; today: string; currency: CurrencyCode; onClose: () => void }) {
  const [open, setOpen] = React.useState(true);
  const [amount, setAmount] = React.useState(item.estimatedCost ? String(item.estimatedCost * Math.max(1, item.quantity)) : "");
  const [error, setError] = React.useState("");
  const close = (o: boolean) => {
    setOpen(o);
    if (!o) setTimeout(onClose, 200);
  };
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={close}
      title={`Bought ${item.name}?`}
      description="Logs it under Shopping and takes it off your to-buy list."
      footer={
        <Button
          size="lg"
          className="lg:h-10"
          onClick={() => {
            const n = Number(amount);
            if (!amount || Number.isNaN(n) || n < 0) return setError("Enter what you paid");
            markBought(item.id, tripId, Math.round(n), today);
            toast.success(`${money(n, currency)} added to Shopping`);
            close(false);
          }}
        >
          Log purchase
        </Button>
      }
    >
      <Field label="Amount paid" htmlFor="buy-amt" error={error}>
        <MoneyInput id="buy-amt" autoFocus symbol={currencySymbol(currency)} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
    </ResponsiveSheet>
  );
}
