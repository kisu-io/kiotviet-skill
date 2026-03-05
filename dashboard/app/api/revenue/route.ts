import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = parseInt(searchParams.get("range") || "30");
    const branchFilter = searchParams.get("branch") || null;

    const { api, config, backend } = createApiClient();

    const now = new Date();
    const fromDate = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = now.toISOString().split("T")[0];

    const baseParams: Record<string, any> = {
      fromPurchaseDate: fromStr,
      toPurchaseDate: toStr,
    };
    if (branchFilter) baseParams.branchId = branchFilter;
    else if (config.branchId) baseParams.branchId = config.branchId;

    const [invoicesResult, detailsResult] = await Promise.all([
      backend.getInvoices(api, baseParams),
      backend.getInvoiceDetails(api, { fromPurchaseDate: fromStr, toPurchaseDate: toStr, ...(branchFilter ? { branchId: branchFilter } : config.branchId ? { branchId: config.branchId } : {}) }),
    ]);

    if (invoicesResult.error) return NextResponse.json({ error: invoicesResult.error }, { status: 502 });

    const invoices: any[] = invoicesResult.data;

    // Revenue by day
    const revenueByDay: Record<string, { date: string; revenue: number; orders: number; avgOrderValue: number }> = {};
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      revenueByDay[key] = {
        date: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        revenue: 0,
        orders: 0,
        avgOrderValue: 0,
      };
    }
    for (const inv of invoices) {
      const key = (inv.purchaseDate || "").split("T")[0];
      if (revenueByDay[key]) {
        revenueByDay[key].revenue += inv.totalPayment || 0;
        revenueByDay[key].orders += 1;
      }
    }
    const chartData = Object.values(revenueByDay).map((d) => ({
      ...d,
      avgOrderValue: d.orders > 0 ? Math.round(d.revenue / d.orders) : 0,
    }));

    // By branch
    const branchMap: Record<string, { branch: string; revenue: number; orders: number; totalCost: number }> = {};
    for (const inv of invoices) {
      const branch = inv.branchName || "Không xác định";
      if (!branchMap[branch]) branchMap[branch] = { branch, revenue: 0, orders: 0, totalCost: 0 };
      branchMap[branch].revenue += inv.totalPayment || 0;
      branchMap[branch].orders += 1;
      branchMap[branch].totalCost += inv.totalCost || 0;
    }
    const byBranch = Object.values(branchMap)
      .map((b) => ({
        ...b,
        avgOrderValue: b.orders > 0 ? Math.round(b.revenue / b.orders) : 0,
        margin: b.revenue > 0 ? Math.round(((b.revenue - b.totalCost) / b.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Top products by revenue (from invoice details)
    const productMap: Record<number, { id: number; name: string; category: string; revenue: number; unitsSold: number; cost: number }> = {};
    if (!detailsResult.error) {
      for (const d of detailsResult.data) {
        const id = d.productId;
        if (!id) continue;
        if (!productMap[id]) {
          productMap[id] = {
            id,
            name: d.productName || `SP#${id}`,
            category: d.categoryName || "",
            revenue: 0,
            unitsSold: 0,
            cost: 0,
          };
        }
        productMap[id].revenue += d.subTotal || 0;
        productMap[id].unitsSold += d.quantity || 0;
        productMap[id].cost += (d.cost || 0) * (d.quantity || 0);
      }
    }
    const topProducts = Object.values(productMap)
      .map((p) => ({
        ...p,
        margin: p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    // Summary
    const totalRevenue = invoices.reduce((s: number, i: any) => s + (i.totalPayment || 0), 0);
    const totalOrders = invoices.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Compare to previous period
    const prevFrom = new Date(fromDate.getTime() - range * 24 * 60 * 60 * 1000);
    const prevInvoicesResult = await backend.getInvoices(api, {
      fromPurchaseDate: prevFrom.toISOString().split("T")[0],
      toPurchaseDate: fromStr,
      ...(branchFilter ? { branchId: branchFilter } : config.branchId ? { branchId: config.branchId } : {}),
    });
    const prevRevenue = prevInvoicesResult.error ? 0 : prevInvoicesResult.data.reduce((s: number, i: any) => s + (i.totalPayment || 0), 0);
    const revenueChange = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;

    return NextResponse.json({
      range,
      summary: { totalRevenue, totalOrders, avgOrderValue, revenueChange, prevRevenue },
      chartData,
      byBranch,
      topProducts,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
