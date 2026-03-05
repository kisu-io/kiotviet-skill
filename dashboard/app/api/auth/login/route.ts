import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "kv_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: Request) {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;
  if (!dashboardPassword) {
    // No password set — auto-login
    const token = crypto.randomBytes(32).toString("hex");
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
    return NextResponse.json({ success: true });
  }

  const body = await request.json();
  if (!body.password || body.password !== dashboardPassword) {
    return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
  }

  const token = hashPassword(dashboardPassword + Date.now());
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ success: true });
}
