import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");
const SHOPS_DIR = path.join(ROOT, "shops");

function getConfigPath(shopId = "example-shop") {
  return path.join(SHOPS_DIR, `${shopId}.json`);
}

/** GET — return current alert config */
export async function GET() {
  try {
    const configPath = getConfigPath();
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return NextResponse.json({
      alerts: config.alerts || {},
      channels: config.channels || {},
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** POST — update alert config */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const configPath = getConfigPath();
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    if (body.alerts) {
      config.alerts = {
        ...config.alerts,
        revenueAnomaly: {
          ...(config.alerts?.revenueAnomaly || {}),
          ...(body.alerts.revenueAnomaly || {}),
        },
      };
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return NextResponse.json({ success: true, alerts: config.alerts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
