import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { api, config, backend } = createApiClient();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const params: Record<string, any> = {
      fromPurchaseDate: sevenDaysAgo.toISOString().split("T")[0],
      toPurchaseDate: now.toISOString().split("T")[0],
    };
    if (config.branchId) params.branchId = config.branchId;

    const result = await backend.getInvoices(api, params);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const orders = result.data.map((i: any) => ({
      id: i.code || String(i.id),
      date: i.purchaseDate ? new Date(i.purchaseDate).toLocaleDateString("vi-VN") : "",
      customer: i.customerName || "Khách lẻ",
      items: i.invoiceDetails?.length || 0,
      total: i.totalPayment || 0,
      status: i.status === 1 ? "completed" : i.status === 3 ? "cancelled" : "pending",
    }));

    return NextResponse.json({ orders, total: result.total });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
