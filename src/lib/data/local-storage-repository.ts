import type { AppData } from "@/lib/types";
import { CorruptDataError, type Change, type Repository } from "./repository";
import { migrate } from "./migrate";

const KEY = "waypoint:data:v1";

export class LocalStorageRepository implements Repository {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: AppData | null = null;

  async load(): Promise<AppData | null> {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return migrate(JSON.parse(raw));
    } catch (err) {
      throw new CorruptDataError(raw, err);
    }
  }

  async commit(_changes: Change[], next: AppData): Promise<void> {
    // Coalesce rapid edits (typing, toggling) into one write.
    this.pending = next;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 120);
  }

  flush() {
    if (!this.pending || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.pending));
    } catch (err) {
      console.error("[waypoint] Could not save to localStorage", err);
      window.dispatchEvent(new CustomEvent("waypoint:save-error"));
    }
    this.pending = null;
    this.timer = null;
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY);
  }

  readRaw(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(KEY);
  }
}

export const repository = new LocalStorageRepository();

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => repository.flush());
}
