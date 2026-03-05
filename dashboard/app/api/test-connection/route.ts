import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { api } = createApiClient();

    // Test by fetching branches (lightweight endpoint)
    const result = await api.get("/branches", { pageSize: 1 });

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error });
    }

    return NextResponse.json({
      success: true,
      message: "Kết nối KiotViet API thành công",
      branches: result.total || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
