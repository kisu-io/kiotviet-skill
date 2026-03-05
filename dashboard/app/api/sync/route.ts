import { NextResponse } from "next/server";
import { getBackend } from "@/lib/backend";
import { invalidateAll, set, TTL } from "@/lib/cache";

/**
 * GET  /api/sync  — return cache status (what's cached and how old)
 * POST /api/sync  — flush cache for the shop and re-fetch key datasets
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");
const CACHE_BASE = path.join(ROOT, "shops", ".cache");

function getCacheStatus(shopId: string) {
  const dir = path.join(CACHE_BASE, shopId);
  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      const key = f.replace(".json", "");
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
        const ageMs = Date.now() - new Date(raw.cachedAt).getTime();
        const stale = ageMs > raw.ttlMs;
        return {
          key,
          cachedAt: raw.cachedAt,
          ageMinutes: Math.round(ageMs / 60000),
          ttlMinutes: Math.round(raw.ttlMs / 60000),
          stale,
        };
      } catch {
        return { key, error: "unreadable" };
      }
    });
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const { config } = getBackend();
    const shopId = config.shopId || "example-shop";
    const entries = getCacheStatus(shopId);
    return NextResponse.json({ shopId, entries, count: entries.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { api, config, backend } = getBackend();
    const shopId = config.shopId || "example-shop";

    // Flush all cached data for this shop
    invalidateAll(shopId);

    const results: Record<string, string> = {};

    // Re-fetch and cache products
    try {
      const products = await api.getProducts({ pageSize: 100 });
      set(shopId, "products", products, TTL.products);
      results.products = "ok";
    } catch (e: any) {
      results.products = `error: ${e.message}`;
    }

    // Re-fetch and cache customers
    try {
      const customers = await api.getCustomers({ pageSize: 100 });
      set(shopId, "customers", customers, TTL.customers);
      results.customers = "ok";
    } catch (e: any) {
      results.customers = `error: ${e.message}`;
    }

    // Re-fetch and cache recent invoices
    try {
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      const invoices = await api.getInvoices({
        fromPurchaseDate: from.toISOString().split("T")[0],
        toPurchaseDate: today.toISOString().split("T")[0],
        pageSize: 100,
      });
      set(shopId, "invoices_30d", invoices, TTL.invoices);
      results.invoices_30d = "ok";
    } catch (e: any) {
      results.invoices_30d = `error: ${e.message}`;
    }

    return NextResponse.json({
      ok: true,
      shopId,
      synced: Object.keys(results).filter((k) => results[k] === "ok").length,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
