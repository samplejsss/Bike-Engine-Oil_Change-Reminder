import { NextResponse } from "next/server";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { webpush } from "@/lib/webPush";

export async function POST(request) {
  try {
    const { userId, title, body } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const webPushSubscriptions = userData.webPushSubscriptions || [];

    if (webPushSubscriptions.length === 0 || userData.notificationsEnabled === false) {
      return NextResponse.json({ success: true, message: "Notifications disabled or no subscriptions" });
    }

    const payload = JSON.stringify({ title, body });
    let sentCount = 0;

    for (const subStr of webPushSubscriptions) {
      try {
        const sub = JSON.parse(subStr);
        await webpush.sendNotification(sub, payload);
        sentCount++;
      } catch (err) {
        console.error("Web Push Send Error:", err);
      }
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (error) {
    console.error("Push API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
