import { buildSeed } from "./seed";

const STORAGE_KEY = "swiftwork-demo";
export const MOCK_DB_VERSION = 2;

interface DbShape {
  version: number;
  collections: Record<string, unknown[]>;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function freshDb(): DbShape {
  return { version: MOCK_DB_VERSION, collections: buildSeed() };
}

function loadDb(): DbShape {
  if (!isBrowser()) return freshDb(); // SSR: ephemeral seed, never persisted
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DbShape;
      if (parsed.version === MOCK_DB_VERSION) return parsed;
    } catch {
      /* fall through to reseed */
    }
  }
  const seeded = freshDb();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveDb(db: DbShape): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/** Read a collection by name. Returns [] if the collection was never seeded. */
export function readCollection<T>(name: string): T[] {
  const db = loadDb();
  return (db.collections[name] as T[] | undefined) ?? [];
}

/** Overwrite a collection by name and persist. */
export function writeCollection<T>(name: string, rows: T[]): void {
  const db = loadDb();
  db.collections[name] = rows as unknown[];
  saveDb(db);
}

/** Wipe everything back to seed. */
export function resetDemo(): void {
  if (!isBrowser()) return;
  saveDb(freshDb());
}
