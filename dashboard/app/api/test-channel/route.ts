import { NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";

const ROOT = path.resolve(process.cwd(), "..");
const SRC = path.join(ROOT, "src");
const _require = eval("require") as NodeRequire;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const channel = body.channel || "discord";

    const { loadShopConfig } = _require(path.join(SRC, "config/loader"));
    const config = loadShopConfig("example-shop");

    const channelModule = _require(path.join(SRC, `channels/${channel}`));
    const message = `Test message from KiotViet Gateway Dashboard\n${new Date().toLocaleString("vi-VN")}`;
    const result = await channelModule.send(config, message);

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error });
    }

    return NextResponse.json({ success: true, message: `Đã gửi test qua ${channel}` });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
