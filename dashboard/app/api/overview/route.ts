import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { api, config, backend } = createApiClient();

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate7 = sevenDaysAgo.toISOString().split("T")[0];

    const baseParams: Record<string, any> = {};
    if (config.branchId) baseParams.branchId = config.branchId;

    const [weekInvoices, lowStockData, insights] = await Promise.all([
      backend.getInvoices(api, { ...baseParams, fromPurchaseDate: fromDate7, toPurchaseDate: today }),
      backend.getLowStock(api, config.workflows.lowStockThreshold, config.branchId),
      backend.getRevenueInsights(api, config),
    ]);

    // Build revenue by day for chart
    const revenueByDay: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      revenueByDay[key] = { revenue: 0, orders: 0 };
    }

    if (!weekInvoices.error) {
      for (const inv of weekInvoices.data) {
        const date = (inv.purchaseDate || "").split("T")[0];
        if (revenueByDay[date]) {
          revenueByDay[date].revenue += inv.totalPayment || 0;
          revenueByDay[date].orders += 1;
        }
      }
    }

    const chartData = Object.entries(revenueByDay).map(([date, val]) => ({
      date: new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      revenue: val.revenue,
      orders: val.orders,
    }));

    const todayInvoices = weekInvoices.error ? [] : weekInvoices.data.filter(
      (i: any) => (i.purchaseDate || "").startsWith(today)
    );
    const todayRevenue = todayInvoices.reduce((s: number, i: any) => s + (i.totalPayment || 0), 0);
    const weekRevenue = weekInvoices.error ? 0 : weekInvoices.data.reduce((s: number, i: any) => s + (i.totalPayment || 0), 0);

    const recentOrders = weekInvoices.error ? [] : weekInvoices.data.slice(0, 5).map((i: any) => ({
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
      avgDaily: 0,
      daysLeft: 0,
      priority: (p.onHand || 0) <= 3 ? "critical" : "warning",
    }));

    return NextResponse.json({
      kpiCards: {
        todayRevenue,
        todayOrders: todayInvoices.length,
        weekRevenue,
        weekRevenueChange: !insights.error ? insights.weekOverWeek.revenue.change : 0,
        monthRevenue: !insights.error ? insights.monthOverMonth.revenue.current : 0,
        monthRevenueChange: !insights.error ? insights.monthOverMonth.revenue.change : 0,
        lowStockCount: lowStockData.error ? 0 : lowStockData.total,
      },
      revenueByDay: chartData,
      recentOrders,
      lowStockProducts,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
