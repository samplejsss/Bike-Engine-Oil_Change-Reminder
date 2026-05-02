import { NextResponse } from "next/server";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { webpush } from "@/lib/webPush";

// Helper: send web push + store in Firestore in-app notifications
async function notify(userId, webPushSubscriptions, { title, body, type = "info" }) {
  // 1. Store in Firestore (in-app notification center)
  try {
    await addDoc(collection(db, "users", userId, "notifications"), {
      title, body, type, read: false, createdAt: serverTimestamp(),
    });
  } catch (err) { console.error("Firestore notify error:", err); }

  // 2. Send Web Push to all subscriptions
  const payload = JSON.stringify({ title, body });
  for (const subStr of webPushSubscriptions) {
    try {
      const sub = JSON.parse(subStr);
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.warn("Stale push subscription, skipping.");
      } else {
        console.error("Web Push Send Error:", err);
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

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    let notificationsSent = 0;

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const webPushSubscriptions = userData.webPushSubscriptions || [];

      if (userData.notificationsEnabled === false) continue;

      const bikesSnap = await getDocs(collection(db, "users", userId, "bikes"));

      for (const bikeDoc of bikesSnap.docs) {
        const bikeData = bikeDoc.data();
        const bikeName = bikeData.name || "Your Bike";
        const currentOdometer = bikeData.lastOdometerReading || 0;
        const oilChangeInterval = bikeData.oilChangeInterval || 2000;
        const lastResetKm = bikeData.lastResetKm || 0;
        const kmSinceChange = Math.max(0, currentOdometer - lastResetKm);
        const kmRemaining = Math.max(0, oilChangeInterval - kmSinceChange);

        // 1. Daily oil change status notification
        await notify(userId, webPushSubscriptions, {
          title: `🛢️ ${bikeName} Daily Oil Status`,
          body: kmRemaining <= 0
            ? `Oil change is OVERDUE! You've ridden ${kmSinceChange.toFixed(0)} km since the last change.`
            : `${kmRemaining.toFixed(0)} km remaining until your next oil change. Keep riding safely!`,
          type: kmRemaining <= 0 ? "alert" : "oil",
        });
        notificationsSent++;

        // 2. Extra urgent alert if overdue or within 200km
        if (kmRemaining <= 200 && kmRemaining > 0) {
          await notify(userId, webPushSubscriptions, {
            title: `⚠️ Oil Change Due Soon – ${bikeName}`,
            body: `Only ${kmRemaining.toFixed(0)} km left before your oil change! Book your service now.`,
            type: "alert",
          });
          notificationsSent++;
        }

        // 3. Check Maintenance Tasks
        const tasksSnap = await getDocs(
          collection(db, "users", userId, "bikes", bikeDoc.id, "maintenanceTasks")
        );

        for (const taskDoc of tasksSnap.docs) {
          const taskData = taskDoc.data();
          let isDue = false;
          let reason = "";
          let daysUntilDue = null;

          if (taskData.nextDueKm && currentOdometer >= taskData.nextDueKm) {
            isDue = true;
            reason = `odometer ${currentOdometer} km has reached the due point of ${taskData.nextDueKm} km`;
          } else if (taskData.nextDueDate) {
            const nextDate = taskData.nextDueDate.toDate
              ? taskData.nextDueDate.toDate()
              : new Date(taskData.nextDueDate);
            const now = new Date();
            daysUntilDue = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
            if (daysUntilDue <= 0) {
              isDue = true;
              reason = `it was due on ${nextDate.toLocaleDateString("en-IN")}`;
            } else if (daysUntilDue <= 3) {
              // Upcoming in 3 days – send a reminder
              await notify(userId, webPushSubscriptions, {
                title: `🔧 "${taskData.taskName}" due in ${daysUntilDue} day(s)`,
                body: `Upcoming maintenance for ${bikeName}. Schedule it before ${nextDate.toLocaleDateString("en-IN")}.`,
                type: "maintenance",
              });
              notificationsSent++;
            }
          }

          if (isDue) {
            await notify(userId, webPushSubscriptions, {
              title: `🔧 ${bikeName} Maintenance Due!`,
              body: `"${taskData.taskName}" is due – ${reason}. Open BikeCare to log the service.`,
              type: "maintenance",
            });
            notificationsSent++;
          }
        }

        // 4. Check Document Expiry (documents sub-collection)
        try {
          const docsSnap = await getDocs(
            collection(db, "users", userId, "bikes", bikeDoc.id, "documents")
          );
          for (const docSnap of docsSnap.docs) {
            const docData = docSnap.data();
            if (!docData.expiryDate) continue;
            const expiry = docData.expiryDate.toDate
              ? docData.expiryDate.toDate()
              : new Date(docData.expiryDate);
            const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 30 && daysLeft > 0) {
              await notify(userId, webPushSubscriptions, {
                title: `📄 ${docData.type || "Document"} Expiring in ${daysLeft} days`,
                body: `"${docData.fileName}" for ${bikeName} expires on ${expiry.toLocaleDateString("en-IN")}. Renew it now!`,
                type: "alert",
              });
              notificationsSent++;
            } else if (daysLeft <= 0) {
              await notify(userId, webPushSubscriptions, {
                title: `📄 ${docData.type || "Document"} EXPIRED`,
                body: `"${docData.fileName}" for ${bikeName} has expired. Please renew immediately!`,
                type: "alert",
              });
              notificationsSent++;
            }
          }
        } catch (err) {
          console.error("Document check error:", err);
        }
      }
    }

    return NextResponse.json({ success: true, notificationsSent });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

