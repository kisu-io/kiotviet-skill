import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/backend";

export const dynamic = "force-dynamic";

function formatVND(n: number) {
  return Math.round(n).toLocaleString("vi-VN").replace(/,/g, ".") + " ₫";
}

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();
    if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

    const { api, config, backend } = createApiClient();

    const q = question.toLowerCase();

    // FR-17: per-question handlers
    if (q.includes("doanh thu") && (q.includes("hôm qua") || q.includes("hom qua"))) {
      return handleRevenueYesterday(api, config, backend);
    }
    if (q.includes("sản phẩm") && q.includes("bán chạy") || q.includes("top") && q.includes("sản phẩm")) {
      return handleTopProducts(api, config, backend);
    }
    if (q.includes("hết hàng") || q.includes("tồn kho") && q.includes("nguy cơ")) {
      return handleStockoutRisk(api, config, backend);
    }
    if (q.includes("doanh thu") && q.includes("giảm") || q.includes("tại sao") && q.includes("doanh thu")) {
      return handleRevenueDown(api, config, backend);
    }
    if (q.includes("khách hàng") && (q.includes("mất") || q.includes("nguy cơ") || q.includes("at-risk"))) {
      return handleAtRiskCustomers(api, config, backend);
    }

    return NextResponse.json({
      question,
      answer: "Tôi chưa hiểu câu hỏi này. Vui lòng thử một trong các câu hỏi gợi ý bên dưới.",
      chart: null,
      actions: [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function handleRevenueYesterday(api: any, config: any, backend: any) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yStr = yesterday.toISOString().split("T")[0];
  const baseParams: any = { fromPurchaseDate: yStr, toPurchaseDate: yStr };
  if (config.branchId) baseParams.branchId = config.branchId;

  const [ydResult, insights] = await Promise.all([
    backend.getInvoices(api, baseParams),
    backend.getRevenueInsights(api, config),
  ]);

  const ydInvoices = ydResult.error ? [] : ydResult.data;
  const ydRevenue = ydInvoices.reduce((s: number, i: any) => s + (i.totalPayment || 0), 0);
  const wow = insights.error ? null : insights.weekOverWeek;

  const changeStr = wow
    ? ` (${wow.revenue.change > 0 ? "+" : ""}${wow.revenue.change}% so với tuần trước)`
    : "";

  return NextResponse.json({
    question: "Tại sao doanh thu hôm qua như thế nào?",
    answer: `Hôm qua (${yesterday.toLocaleDateString("vi-VN")}): doanh thu ${formatVND(ydRevenue)}, tổng ${ydInvoices.length} đơn hàng${changeStr}.`,
    chart: {
      type: "stat",
      data: { revenue: ydRevenue, orders: ydInvoices.length, wow: wow?.revenue.change ?? 0 },
    },
    actions: [
      { label: "Xem chi tiết doanh thu", href: "/revenue" },
      { label: "Kiểm tra tồn kho", href: "/inventory" },
    ],
  });
}

async function handleTopProducts(api: any, config: any, backend: any) {
  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const params: any = {
    fromPurchaseDate: fromDate.toISOString().split("T")[0],
    toPurchaseDate: now.toISOString().split("T")[0],
  };
  if (config.branchId) params.branchId = config.branchId;

  const details = await backend.getInvoiceDetails(api, params);
  if (details.error) return NextResponse.json({ answer: `Lỗi lấy dữ liệu: ${details.error}`, actions: [] });

  const productMap: Record<number, { name: string; revenue: number; units: number }> = {};
  for (const d of details.data) {
    if (!d.productId) continue;
    if (!productMap[d.productId]) productMap[d.productId] = { name: d.productName || `SP#${d.productId}`, revenue: 0, units: 0 };
    productMap[d.productId].revenue += d.subTotal || 0;
    productMap[d.productId].units += d.quantity || 0;
  }
  const top5 = Object.entries(productMap).map(([id, p]) => ({ id: Number(id), ...p })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const listStr = top5.map((p, i) => `${i + 1}. ${p.name}: ${formatVND(p.revenue)} (${p.units} SP)`).join("\n");

  return NextResponse.json({
    question: "Top sản phẩm bán chạy tháng này?",
    answer: `Top 5 sản phẩm bán chạy trong 30 ngày qua:\n${listStr}`,
    chart: { type: "table", data: top5 },
    actions: [{ label: "Xem toàn bộ doanh thu", href: "/revenue" }],
  });
}

async function handleStockoutRisk(api: any, config: any, backend: any) {
  const forecast = await backend.forecastDemand(api, config);
  if (forecast.error) return NextResponse.json({ answer: `Lỗi: ${forecast.error}`, actions: [] });

  const critical = forecast.recommendations.filter((r: any) => r.priority === "critical");
  const warning = forecast.recommendations.filter((r: any) => r.priority === "warning");

  let answer = "";
  if (critical.length === 0 && warning.length === 0) {
    answer = "✅ Không có sản phẩm nào có nguy cơ hết hàng trong 7 ngày tới.";
  } else {
    answer = `⚠️ ${critical.length} sản phẩm hết hàng trong ≤3 ngày, ${warning.length} sản phẩm trong 4–7 ngày.\n\n`;
    answer += critical.slice(0, 5).map((r: any) => `🔴 ${r.productName}: còn ${r.onHand}, hết trong ${r.daysUntilStockout} ngày`).join("\n");
  }

  return NextResponse.json({
    question: "Sản phẩm nào có nguy cơ hết hàng?",
    answer,
    chart: { type: "table", data: [...critical, ...warning].slice(0, 10) },
    actions: [{ label: "Xem đề xuất nhập hàng", href: "/inventory" }],
  });
}

async function handleRevenueDown(api: any, config: any, backend: any) {
  const insights = await backend.getRevenueInsights(api, config);
  if (insights.error) return NextResponse.json({ answer: `Lỗi: ${insights.error}`, actions: [] });

  const wow = insights.weekOverWeek;
  const trend = wow.trend;

  let answer = "";
  if (trend === "down") {
    answer = `Doanh thu tuần này giảm ${Math.abs(wow.revenue.change)}% so với tuần trước. ` +
      `Tuần này: ${formatVND(wow.revenue.current)}, tuần trước: ${formatVND(wow.revenue.previous)}. ` +
      `Hãy kiểm tra tồn kho và tình trạng khách hàng thường xuyên.`;
  } else if (trend === "up") {
    answer = `Doanh thu tuần này tăng ${wow.revenue.change}% so với tuần trước. Tiếp tục phát huy!`;
  } else {
    answer = `Doanh thu tuần này ổn định (${wow.revenue.change > 0 ? "+" : ""}${wow.revenue.change}% so với tuần trước).`;
  }

  return NextResponse.json({
    question: "Tại sao doanh thu giảm?",
    answer,
    chart: {
      type: "stat",
      data: { current: wow.revenue.current, previous: wow.revenue.previous, change: wow.revenue.change },
    },
    actions: [
      { label: "Xem biểu đồ doanh thu", href: "/revenue" },
      { label: "Kiểm tra tồn kho", href: "/inventory" },
    ],
  });
}

async function handleAtRiskCustomers(api: any, config: any, backend: any) {
  const segments = await backend.getCustomerSegments(api, config);
  if (segments.error) return NextResponse.json({ answer: `Lỗi: ${segments.error}`, actions: [] });

  const atRisk = segments.segments?.atRisk || [];
  const lost = segments.segments?.lost || [];

  const answer = `Hiện có ${atRisk.length} khách hàng "Có nguy cơ" và ${lost.length} khách hàng "Đã mất". ` +
    (atRisk.length > 0 ? `Top 3 nguy cơ: ${atRisk.slice(0, 3).map((c: any) => c.customerName).join(", ")}.` : "");

  return NextResponse.json({
    question: "Khách hàng nào đang có nguy cơ?",
    answer,
    chart: { type: "table", data: [...atRisk.slice(0, 5), ...lost.slice(0, 5)] },
    actions: [
      { label: "Xem phân tích khách hàng", href: "/customers" },
      { label: "Chạy Win-back Campaign", href: "/campaigns" },
    ],
  });
}
