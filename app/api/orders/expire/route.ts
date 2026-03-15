import { NextRequest, NextResponse } from "next/server";
import { expireStaleOrders } from "@/lib/orders/expireStaleOrders";

export async function POST(req: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { olderThanMinutes } = (await req.json().catch(() => ({}))) as { olderThanMinutes?: number };
  const minutes = typeof olderThanMinutes === "number" && olderThanMinutes > 0 ? olderThanMinutes : 60;

  const result = await expireStaleOrders(minutes);
  return NextResponse.json({ ok: true, ...result });
}
