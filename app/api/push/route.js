export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { getWebPush } from "@/lib/webPush";

export async function POST(request) {
  try {
    const { subscription, title, body } = await request.json();

    if (!subscription || !title) {
      return NextResponse.json({ error: "Missing subscription or title" }, { status: 400 });
    }

    let wp;
    try {
      wp = getWebPush();
    } catch (err) {
      console.error("[push] VAPID init failed:", err.message);
      return NextResponse.json({ error: "VAPID keys not configured", details: err.message }, { status: 500 });
    }

    const payload = JSON.stringify({ title, body: body || "" });

    try {
      await wp.sendNotification(subscription, payload);
      return NextResponse.json({ success: true });
    } catch (err) {
      const code = err.statusCode;
      if (code === 410 || code === 404) {
        return NextResponse.json({ success: false, message: "Subscription expired" }, { status: 410 });
      }
      console.error("[push] sendNotification error:", err.message);
      return NextResponse.json({ error: "Send failed", details: err.message }, { status: 500 });
    }
  } catch (error) {
    console.error("[push] Unexpected error:", error.message);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
