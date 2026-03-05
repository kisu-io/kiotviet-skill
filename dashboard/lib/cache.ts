/**
 * Lightweight JSON file cache for KiotViet API responses.
 *
 * Cache files are stored in: <repo-root>/shops/.cache/<shopId>/<key>.json
 * Each file has the shape: { cachedAt: ISO string, ttlMs: number, data: any }
 *
 * TTLs (configurable via set()):
 *   products   — 60 min (stock changes infrequently)
 *   customers  — 60 min
 *   invoices   — 5 min  (orders update frequently)
 *   default    — 15 min
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");
const CACHE_BASE = path.join(ROOT, "shops", ".cache");

export const TTL = {
  products: 60 * 60 * 1000,   // 1 hour
  customers: 60 * 60 * 1000,  // 1 hour
  invoices: 5 * 60 * 1000,    // 5 minutes
  default: 15 * 60 * 1000,    // 15 minutes
};

function _cacheFile(shopId: string, key: string) {
  return path.join(CACHE_BASE, shopId, `${key}.json`);
}

export function get<T>(shopId: string, key: string): T | null {
  try {
    const file = _cacheFile(shopId, key);
    const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
    const age = Date.now() - new Date(raw.cachedAt).getTime();
    if (age > raw.ttlMs) return null; // stale
    return raw.data as T;
  } catch {
    return null;
  }
}

export function set(shopId: string, key: string, data: unknown, ttlMs = TTL.default) {
  try {
    const dir = path.join(CACHE_BASE, shopId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      _cacheFile(shopId, key),
      JSON.stringify({ cachedAt: new Date().toISOString(), ttlMs, data }, null, 2)
    );
  } catch (e) {
    // Cache write failure is non-fatal
    console.warn("[cache] write failed:", (e as Error).message);
  }
}

export function invalidate(shopId: string, key: string) {
  try {
    fs.unlinkSync(_cacheFile(shopId, key));
  } catch {
    // already gone
  }
}

export function invalidateAll(shopId: string) {
  try {
    const dir = path.join(CACHE_BASE, shopId);
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith(".json")) fs.unlinkSync(path.join(dir, file));
    }
  } catch {
    // nothing to clear
  }
}

/**
 * Cache-aside helper: return cached value if fresh, else call fetcher,
 * cache the result, and return it.
 */
export async function getOrFetch<T>(
  shopId: string,
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = TTL.default
): Promise<T> {
  const cached = get<T>(shopId, key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  set(shopId, key, fresh, ttlMs);
  return fresh;
}
