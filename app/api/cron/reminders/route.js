export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { getWebPush } from "@/lib/webPush";

// Helper: store in Firestore + send Web Push
// Uses Firebase Admin SDK for server-side Firestore access
async function notify(adminDb, userId, webPushSubscriptions, { title, body, type = "info" }) {
  // 1. Store in Firestore (in-app notification center)
  if (adminDb) {
    try {
      await adminDb.collection("users").doc(userId).collection("notifications").add({
        title, body, type, read: false, createdAt: new Date(),
      });
    } catch (err) { console.error("[cron] Firestore notify error:", err.message); }
  }

  // 2. Send Web Push (only if there are subscriptions)
  if (!webPushSubscriptions || webPushSubscriptions.length === 0) return;

  let wp;
  try { wp = getWebPush(); } catch (e) { console.warn("[cron] VAPID not configured:", e.message); return; }

  const payload = JSON.stringify({ title, body });
  for (const subStr of webPushSubscriptions) {
    try {
      const sub = JSON.parse(subStr);
      await wp.sendNotification(sub, payload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.warn("[cron] Stale push subscription.");
      } else {
        console.error("[cron] sendNotification error:", err.message);
      }
    }
  }
}

export async function GET(request) {
  // Ensure the request comes from Vercel Cron
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Use Firebase Admin SDK (works server-side)
  let adminDb = null;
  try {
    const adminModule = await import("@/lib/firebaseAdmin");
    adminDb = adminModule.adminDb;
  } catch (e) {
    console.error("[cron] Failed to load Firebase Admin:", e.message);
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Firebase Admin not available. Set FIREBASE_SERVICE_ACCOUNT_KEY." }, { status: 500 });
  }

  try {
    const usersSnap = await adminDb.collection("users").get();
    let notificationsSent = 0;

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const webPushSubscriptions = userData.webPushSubscriptions || [];

      if (userData.notificationsEnabled === false) continue;

      const bikesSnap = await adminDb.collection("users").doc(userId).collection("bikes").get();

      for (const bikeDoc of bikesSnap.docs) {
        const bikeData = bikeDoc.data();
        const bikeName = bikeData.name || "Your Bike";
        const currentOdometer = bikeData.lastOdometerReading || 0;
        const oilChangeInterval = bikeData.oilChangeInterval || 2000;
        const lastResetKm = bikeData.lastResetKm || 0;
        const kmSinceChange = Math.max(0, currentOdometer - lastResetKm);
        const kmRemaining = Math.max(0, oilChangeInterval - kmSinceChange);

        // 1. Daily oil change status
        await notify(adminDb, userId, webPushSubscriptions, {
          title: `🛢️ ${bikeName} Daily Oil Status`,
          body: kmRemaining <= 0
            ? `Oil change is OVERDUE! You've ridden ${kmSinceChange.toFixed(0)} km since the last change.`
            : `${kmRemaining.toFixed(0)} km remaining until your next oil change. Keep riding safely!`,
          type: kmRemaining <= 0 ? "alert" : "oil",
        });
        notificationsSent++;

        // 2. Urgent oil change alert (within 200km)
        if (kmRemaining <= 200 && kmRemaining > 0) {
          await notify(adminDb, userId, webPushSubscriptions, {
            title: `⚠️ Oil Change Due Soon – ${bikeName}`,
            body: `Only ${kmRemaining.toFixed(0)} km left before your oil change! Book your service now.`,
            type: "alert",
          });
          notificationsSent++;
        }

        // 3. Maintenance tasks
        const tasksSnap = await adminDb
          .collection("users").doc(userId)
          .collection("bikes").doc(bikeDoc.id)
          .collection("maintenanceTasks")
          .get();

        for (const taskDoc of tasksSnap.docs) {
          const task = taskDoc.data();
          let isDue = false;
          let reason = "";

          if (task.nextDueKm && currentOdometer >= task.nextDueKm) {
            isDue = true;
            reason = `odometer ${currentOdometer} km has reached the due point of ${task.nextDueKm} km`;
          } else if (task.nextDueDate) {
            const nextDate = task.nextDueDate.toDate ? task.nextDueDate.toDate() : new Date(task.nextDueDate);
            const daysUntilDue = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntilDue <= 0) {
              isDue = true;
              reason = `it was due on ${nextDate.toLocaleDateString("en-IN")}`;
            } else if (daysUntilDue <= 3) {
              await notify(adminDb, userId, webPushSubscriptions, {
                title: `🔧 "${task.taskName}" due in ${daysUntilDue} day(s)`,
                body: `Upcoming maintenance for ${bikeName}. Schedule before ${nextDate.toLocaleDateString("en-IN")}.`,
                type: "maintenance",
              });
              notificationsSent++;
            }
          }

          if (isDue) {
            await notify(adminDb, userId, webPushSubscriptions, {
              title: `🔧 ${bikeName} Maintenance Due!`,
              body: `"${task.taskName}" is due – ${reason}. Open BikeCare to log the service.`,
              type: "maintenance",
            });
            notificationsSent++;
          }
        }

        // 4. Document expiry checks
        try {
          const docsSnap = await adminDb
            .collection("users").doc(userId)
            .collection("bikes").doc(bikeDoc.id)
            .collection("documents")
            .get();

          for (const docSnap of docsSnap.docs) {
            const d = docSnap.data();
            if (!d.expiryDate) continue;
            const expiry = d.expiryDate.toDate ? d.expiryDate.toDate() : new Date(d.expiryDate);
            const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 30 && daysLeft > 0) {
              await notify(adminDb, userId, webPushSubscriptions, {
                title: `📄 ${d.type || "Document"} Expiring in ${daysLeft} days`,
                body: `"${d.fileName}" for ${bikeName} expires on ${expiry.toLocaleDateString("en-IN")}. Renew it now!`,
                type: "alert",
              });
              notificationsSent++;
            } else if (daysLeft <= 0) {
              await notify(adminDb, userId, webPushSubscriptions, {
                title: `📄 ${d.type || "Document"} EXPIRED`,
                body: `"${d.fileName}" for ${bikeName} has expired. Please renew immediately!`,
                type: "alert",
              });
              notificationsSent++;
            }
          }
        } catch (err) {
          console.error("[cron] Document check error:", err.message);
        }
      }
    }

    return NextResponse.json({ success: true, notificationsSent });
  } catch (error) {
    console.error("[cron] Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
