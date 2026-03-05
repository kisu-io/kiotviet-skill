import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** GET — run anomaly detection and return result (no alert sent) */
export async function GET() {
  try {
    const { api, config, backend } = createApiClient();

    // If mock mode (no clientId), return mock anomaly result
    if (!config.clientId) {
      const now = new Date();
      const hour = now.getHours();
      const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
      const mockRevenue = Math.floor(Math.random() * 3000000) + 500000;
      const mockMean = Math.floor(Math.random() * 2000000) + 800000;
      const deviation = Math.round(((mockRevenue - mockMean) / mockMean) * 100);
      const absDeviation = Math.abs(deviation);
      const severity = absDeviation >= 50 ? "critical" : absDeviation >= 30 ? "warning" : "none";

      return NextResponse.json({
        anomaly: severity !== "none",
        severity,
        currentHour: hourKey,
        currentRevenue: mockRevenue,
        currentOrderCount: Math.floor(Math.random() * 10) + 1,
        baselineMean: mockMean,
        baselineStdDev: Math.floor(mockMean * 0.2),
        deviationPct: deviation,
        zScore: Math.round((deviation / 20) * 100) / 100,
        baselinePoints: [mockMean * 0.9, mockMean * 1.1, mockMean * 0.95, mockMean * 1.05],
        message: severity !== "none"
          ? `Doanh thu bat thuong: ${deviation > 0 ? "+" : ""}${deviation}% so voi trung binh`
          : "Doanh thu binh thuong",
        config: config.alerts?.revenueAnomaly || {},
      });
    }

    const result = await backend.detectRevenueAnomalies({ api, shopConfig: config });
    return NextResponse.json({ ...result, config: config.alerts?.revenueAnomaly || {} });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST — trigger a "Run now" anomaly check (sends alert if anomaly found) */
export async function POST() {
  try {
    const { config, backend } = createApiClient();

    if (!config.clientId) {
      return NextResponse.json({
        shopId: config.shopId,
        workflow: "revenue-anomaly-hourly",
        timestamp: new Date().toISOString(),
        detection: { anomaly: false, severity: "none", message: "Mock mode — no real check" },
        channelResult: { skipped: true, reason: "mock mode" },
      });
    }

    const result = await backend.runRevenueAnomalyCheck(config.shopId, { force: true });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
