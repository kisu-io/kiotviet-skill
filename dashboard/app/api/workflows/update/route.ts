import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");
const SHOPS_DIR = path.join(ROOT, "shops");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const configPath = path.join(SHOPS_DIR, "example-shop.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    // Update workflow settings
    if (body.workflows) {
      config.workflows = { ...config.workflows, ...body.workflows };
    }
    if (body.channels) {
      config.channels = { ...config.channels, ...body.channels };
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return NextResponse.json({ success: true, config });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
