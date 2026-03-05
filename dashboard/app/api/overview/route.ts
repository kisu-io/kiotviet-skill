import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7"; // today | 7 | 30

    const { api, config, backend } = createApiClient();

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    let fromStr: string;
    if (range === "today") {
      fromStr = today;
    } else {
      const days = parseInt(range) || 7;
      fromStr = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    }

    const baseParams: Record<string, any> = {};
    if (config.branchId) baseParams.branchId = config.branchId;

    const [invoices, lowStockData, insights, detailsResult] = await Promise.all([
      backend.getInvoices(api, { ...baseParams, fromPurchaseDate: fromStr, toPurchaseDate: today }),
      backend.getLowStock(api, config.workflows.lowStockThreshold, config.branchId),
      backend.getRevenueInsights(api, config),
      backend.getInvoiceDetails(api, { ...baseParams, fromPurchaseDate: fromStr, toPurchaseDate: today }),
    ]);

    const invoiceList: any[] = invoices.error ? [] : invoices.data;

    // Revenue by day
    const days = range === "today" ? 1 : (parseInt(range) || 7);
    const revenueByDay: Record<string, { revenue: number; orders: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      revenueByDay[key] = { revenue: 0, orders: 0 };
    }
    for (const inv of invoiceList) {
      const key = (inv.purchaseDate || "").split("T")[0];
      if (revenueByDay[key]) {
        revenueByDay[key].revenue += inv.totalPayment || 0;
        revenueByDay[key].orders += 1;
      }
    }
    const chartData = Object.entries(revenueByDay).map(([date, val]) => ({
      date: new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      revenue: val.revenue,
      orders: val.orders,
    }));

    // Today KPIs
    const todayInvoices = invoiceList.filter((i: any) => (i.purchaseDate || "").startsWith(today));
    const todayRevenue = todayInvoices.reduce((s: number, i: any) => s + (i.totalPayment || 0), 0);
    const totalRevenue = invoiceList.reduce((s: number, i: any) => s + (i.totalPayment || 0), 0);

    // Top 5 products by revenue (from invoice details)
    const productMap: Record<number, { name: string; revenue: number; units: number }> = {};
    if (!detailsResult.error) {
      for (const d of detailsResult.data) {
        if (!d.productId) continue;
        if (!productMap[d.productId]) productMap[d.productId] = { name: d.productName || `SP#${d.productId}`, revenue: 0, units: 0 };
        productMap[d.productId].revenue += d.subTotal || 0;
        productMap[d.productId].units += d.quantity || 0;
      }
    }
    const topProducts = Object.entries(productMap)
      .map(([id, p]) => ({ id: Number(id), ...p }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Recent activity
    const recentOrders = invoiceList.slice(0, 5).map((i: any) => ({
      id: i.code || i.id,
      customer: i.customerName || "Khách lẻ",
      total: i.totalPayment || 0,
      status: i.status === 1 ? "completed" : "pending",
      time: i.purchaseDate ? new Date(i.purchaseDate).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "",
    }));

    const lowStockProducts = lowStockData.error ? [] : lowStockData.data.slice(0, 10).map((p: any) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.categoryName || "",
      onHand: p.onHand || 0,
      priority: (p.onHand || 0) <= 3 ? "critical" : "warning",
    }));

    // Alert summary for alert cards
    const alertsSummary = {
      revenueAnomalyCount: 0, // runtime anomaly check — show from anomaly API
      lowStockCount: lowStockData.error ? 0 : lowStockData.total,
      deadStockCount: 0, // available via replenishment API
      atRiskCustomerCount: 0, // available via segments API
    };

    return NextResponse.json({
      range,
      kpiCards: {
        todayRevenue,
        todayOrders: todayInvoices.length,
        totalRevenue,
        totalOrders: invoiceList.length,
        weekRevenueChange: !insights.error ? insights.weekOverWeek.revenue.change : 0,
        monthRevenue: !insights.error ? insights.monthOverMonth.revenue.current : 0,
        monthRevenueChange: !insights.error ? insights.monthOverMonth.revenue.change : 0,
        lowStockCount: lowStockData.error ? 0 : lowStockData.total,
        avgOrderValue: invoiceList.length > 0 ? Math.round(totalRevenue / invoiceList.length) : 0,
      },
      revenueByDay: chartData,
      topProducts,
      recentOrders,
      lowStockProducts,
      alertsSummary,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
