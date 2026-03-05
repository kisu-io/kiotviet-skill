import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE = "kv_session";

export async function GET() {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;

  // No password configured — always authenticated
  if (!dashboardPassword) {
    return NextResponse.json({ authenticated: true });
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (!session?.value) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
