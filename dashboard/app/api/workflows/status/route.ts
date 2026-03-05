import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");
const JOBS_FILE = path.join(ROOT, "cron/jobs.json");
const SHOPS_DIR = path.join(ROOT, "shops");

export async function GET() {
  try {
    const jobs = JSON.parse(fs.readFileSync(JOBS_FILE, "utf-8"));

    // Read shop config for workflow settings
    const configPath = path.join(SHOPS_DIR, "example-shop.json");
    const shopConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    return NextResponse.json({
      jobs: jobs.jobs,
      workflows: shopConfig.workflows || {},
      channels: shopConfig.channels || {},
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
