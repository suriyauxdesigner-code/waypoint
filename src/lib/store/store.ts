"use client";

import { create } from "zustand";
import type { AppData, CollectionKey } from "@/lib/types";
import { emptyData } from "@/lib/data/defaults";
import { buildDemoData } from "@/lib/data/demo";
import type { Change } from "@/lib/data/repository";
import { CorruptDataError } from "@/lib/data/repository";
import { repository } from "@/lib/data/local-storage-repository";

type Status = "idle" | "loading" | "ready" | "error";

interface StoreState {
  status: Status;
  error: string | null;
  data: AppData;
  hydrate: () => Promise<void>;
  apply: (changes: Change[]) => void;
}

function applyChange(data: AppData, change: Change): AppData {
  switch (change.op) {
    case "replace":
      return change.data;
    case "settings":
      return { ...data, settings: { ...data.settings, ...change.patch } };
    case "user":
      return { ...data, user: { ...data.user, ...change.patch } };
    case "upsert": {
      const list = data[change.collection] as unknown as { id: string }[];
      const idx = list.findIndex((r) => r.id === change.record.id);
      const next = idx === -1 ? [...list, change.record] : list.map((r, i) => (i === idx ? change.record : r));
      return { ...data, [change.collection]: next };
    }
    case "delete": {
      const list = data[change.collection] as unknown as { id: string }[];
      return { ...data, [change.collection]: list.filter((r) => r.id !== change.id) };
    }
  }
}

export const useStore = create<StoreState>((set, get) => ({
  status: "idle",
  error: null,
  data: emptyData(),

  hydrate: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading" });
    try {
      const stored = await repository.load();
      if (stored) {
        set({ data: stored, status: "ready", error: null });
      } else {
        const demo = buildDemoData();
        set({ data: demo, status: "ready", error: null });
        await repository.commit([{ op: "replace", data: demo }], demo);
      }
    } catch (err) {
      set({
        status: "error",
        error: err instanceof CorruptDataError ? err.message : "Something went wrong loading your trips.",
      });
    }
  },

  apply: (changes) => {
    if (!changes.length) return;
    const next = changes.reduce(applyChange, get().data);
    set({ data: next });
    void repository.commit(changes, next);
  },
}));

/* ---------- low-level helpers used by domain actions ---------- */

export function getData() {
  return useStore.getState().data;
}

export function commit(...changes: Change[]) {
  useStore.getState().apply(changes);
}

export function upsert<K extends CollectionKey>(collection: K, record: AppData[K][number]): Change {
  return { op: "upsert", collection, record: record as unknown as { id: string } & Record<string, unknown> };
}

export function del(collection: CollectionKey, id: string): Change {
  return { op: "delete", collection, id };
}

export async function resetToDemo() {
  const demo = buildDemoData();
  useStore.setState({ status: "ready", error: null });
  commit({ op: "replace", data: demo });
}

export async function startFresh() {
  const empty = emptyData();
  empty.user = { ...getData().user };
  useStore.setState({ status: "ready", error: null });
  commit({ op: "replace", data: empty });
}

export async function wipeStorage() {
  await repository.clear();
  useStore.setState({ status: "idle", data: emptyData(), error: null });
  await useStore.getState().hydrate();
}

export function exportJSON() {
  return JSON.stringify(getData(), null, 2);
}
