import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { api, config, backend } = createApiClient();

    const params: Record<string, any> = {};
    if (config.branchId) params.branchId = config.branchId;

    const result = await backend.getProducts(api, params);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const products = result.data.map((p: any) => ({
      id: p.id,
      code: p.code || "",
      name: p.name || "",
      category: p.categoryName || "",
      unit: p.unit || "Cái",
      onHand: p.onHand || 0,
      cost: p.cost || 0,
      price: p.basePrice || 0,
    }));

    return NextResponse.json({ products, total: result.total });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
