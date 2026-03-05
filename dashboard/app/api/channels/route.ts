import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd(), "..");

export async function GET() {
  try {
    const configPath = path.join(ROOT, "shops/example-shop.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const ch = config.channels || {};

    const channels = [
      {
        id: "discord",
        name: "Discord",
        description: "Gửi thông báo qua Discord webhook",
        configured: !!ch.discord?.webhookUrl,
        enabled: !!ch.discord?.webhookUrl,
        isPrimary: ch.primary === "discord",
      },
      {
        id: "telegram",
        name: "Telegram",
        description: "Gửi thông báo qua Telegram Bot API",
        configured: !!(ch.telegram?.botToken && ch.telegram?.chatId),
        enabled: !!(ch.telegram?.botToken && ch.telegram?.chatId),
        isPrimary: ch.primary === "telegram",
      },
    ];

    return NextResponse.json({ channels, primary: ch.primary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
