import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** POST — run the customer win-back campaign */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dryRun = true, force = false } = body;

    const { config, backend } = createApiClient();

    const result = await backend.runCustomerWinback(config.shopId, { dryRun, force });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** GET — preview campaign audience (dry run) */
export async function GET() {
  try {
    const { api, config, backend } = createApiClient();
    const segments = await backend.getCustomerSegments(api, config);
    if (segments.error) return NextResponse.json({ error: segments.error }, { status: 502 });

    const atRisk = segments.segments?.atRisk || [];
    const lost = segments.segments?.lost || [];

    return NextResponse.json({
      audience: {
        atRisk: atRisk.length,
        lost: lost.length,
        total: atRisk.length + lost.length,
        samples: [...atRisk.slice(0, 3), ...lost.slice(0, 3)].map((c: any) => ({
          name: c.customerName,
          segment: c.segment,
          recency: c.recency,
          monetary: c.monetary,
        })),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
