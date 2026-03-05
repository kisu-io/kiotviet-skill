import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { api, config, backend } = createApiClient();

    const forecast = await backend.forecastDemand(api, config);
    if (forecast.error) return NextResponse.json({ error: forecast.error }, { status: 502 });

    // Enrich with dead stock detection: no sales in 60 days
    const DEAD_STOCK_DAYS = 60;
    const deadStockThreshold = config.workflows?.deadStockMinSales ?? 0;

    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - DEAD_STOCK_DAYS * 24 * 60 * 60 * 1000);
    const allProductsResult = await backend.getProducts(api, config.branchId ? { branchId: config.branchId } : {});
    const detailsResult = await backend.getInvoiceDetails(api, {
      fromPurchaseDate: sixtyDaysAgo.toISOString().split("T")[0],
      toPurchaseDate: now.toISOString().split("T")[0],
      ...(config.branchId ? { branchId: config.branchId } : {}),
    });

    // Products with any sales in last 60 days
    const activeProductIds = new Set<number>();
    if (!detailsResult.error) {
      for (const d of detailsResult.data) {
        if (d.productId) activeProductIds.add(d.productId);
      }
    }

    // Dead stock: products in stock with NO sales in 60 days
    const deadStock: any[] = [];
    if (!allProductsResult.error) {
      for (const p of allProductsResult.data) {
        if ((p.onHand || 0) > 0 && !activeProductIds.has(p.id)) {
          deadStock.push({
            productId: p.id,
            productCode: p.code,
            productName: p.name,
            categoryName: p.categoryName || "",
            onHand: p.onHand || 0,
            daysSinceLastSale: DEAD_STOCK_DAYS,
            priority: "dead",
          });
        }
      }
    }

    return NextResponse.json({
      ...forecast,
      deadStock,
      summary: {
        ...forecast.summary,
        deadStock: deadStock.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
