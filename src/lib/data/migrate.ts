import type { AppData } from "@/lib/types";
import { emptyData } from "./defaults";

/** Bring any stored shape up to the current version, filling missing collections. */
export function migrate(input: unknown): AppData {
  if (!input || typeof input !== "object") throw new Error("Not an object");
  const base = emptyData();
  const obj = input as Partial<AppData>;
  if (typeof obj.version !== "number") throw new Error("Missing version");
  const out: AppData = {
    ...base,
    ...obj,
    user: { ...base.user, ...(obj.user ?? {}) },
    settings: { ...base.settings, ...(obj.settings ?? {}) },
  };
  for (const key of Object.keys(base) as (keyof AppData)[]) {
    if (Array.isArray(base[key]) && !Array.isArray(out[key])) {
      (out as unknown as Record<string, unknown>)[key] = [];
    }
  }
  out.version = 1;
  return out;
}
