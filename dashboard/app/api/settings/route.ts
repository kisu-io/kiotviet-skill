import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");
const SHOPS_DIR = path.join(ROOT, "shops");

export async function GET() {
  try {
    const configPath = path.join(SHOPS_DIR, "example-shop.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    const isConfigured = !!(config.clientId && config.clientSecret && config.retailer);

    // Check token validity
    const tokenPath = path.join(SHOPS_DIR, ".tokens/example-shop.json");
    let tokenValid = false;
    let tokenExpiry = "";
    try {
      const tokenData = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
      if (tokenData.expires_at && Date.now() < new Date(tokenData.expires_at).getTime()) {
        tokenValid = true;
        tokenExpiry = new Date(tokenData.expires_at).toLocaleString("vi-VN");
      }
    } catch (_) {}

    return NextResponse.json({
      shopId: config.shopId,
      retailer: config.retailer || "",
      branchId: config.branchId || null,
      clientId: config.clientId ? "••••" + config.clientId.slice(-4) : "",
      clientSecret: config.clientSecret ? "••••" + config.clientSecret.slice(-4) : "",
      isConfigured,
      tokenValid,
      tokenExpiry,
      channels: config.channels || {},
      workflows: config.workflows || {},
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const configPath = path.join(SHOPS_DIR, "example-shop.json");
    let config: any = {};
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (_) {}

    if (body.retailer !== undefined) config.retailer = body.retailer;
    if (body.branchId !== undefined) config.branchId = body.branchId || null;
    // Allow updating credentials on initial setup or explicit credential update
    if (body.clientId && !body.clientId.startsWith("••••")) config.clientId = body.clientId;
    if (body.clientSecret && !body.clientSecret.startsWith("••••")) config.clientSecret = body.clientSecret;
    if (body.channels) config.channels = { ...config.channels, ...body.channels };
    if (body.workflows) config.workflows = { ...config.workflows, ...body.workflows };

    // Ensure shopId is always set
    if (!config.shopId) config.shopId = "example-shop";

    fs.mkdirSync(SHOPS_DIR, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
