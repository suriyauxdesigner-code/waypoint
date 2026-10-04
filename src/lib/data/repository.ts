import type { AppData, CollectionKey } from "@/lib/types";

/**
 * A change to persisted data. The UI never talks to storage directly — the store
 * applies changes in memory and hands them to a repository.
 *
 * - LocalStorageRepository (today): snapshots the whole document.
 * - A SupabaseRepository (later): maps each change to `upsert`/`delete` on the
 *   table named after `collection`, and `load()` to a set of selects scoped by user.
 */
export type Change =
  | { op: "upsert"; collection: CollectionKey; record: { id: string } & Record<string, unknown> }
  | { op: "delete"; collection: CollectionKey; id: string }
  | { op: "settings"; patch: Partial<AppData["settings"]> }
  | { op: "user"; patch: Partial<AppData["user"]> }
  | { op: "replace"; data: AppData };

export interface Repository {
  /** Returns null when nothing has been stored yet. Throws on corrupt data. */
  load(): Promise<AppData | null>;
  /** Persist a batch of changes. `next` is the full state after applying them. */
  commit(changes: Change[], next: AppData): Promise<void>;
  clear(): Promise<void>;
}

export class CorruptDataError extends Error {
  constructor(public raw: string, cause?: unknown) {
    super("Saved data could not be read.");
    this.name = "CorruptDataError";
    this.cause = cause;
  }
}
