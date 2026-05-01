import { NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firebaseAdmin";

export async function GET(request) {
  // Ensure the request comes from Vercel Cron
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!adminDb || !adminMessaging) {
    return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
  }

  try {
    const usersSnap = await adminDb.collection("users").get();
    let notificationsSent = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const tokens = userData.fcmTokens || [];
      if (tokens.length === 0 || userData.notificationsEnabled === false) continue;

      const bikesSnap = await adminDb.collection("users").doc(userDoc.id).collection("bikes").get();
      
      for (const bikeDoc of bikesSnap.docs) {
        const bikeData = bikeDoc.data();
        const bikeName = bikeData.name || "Your Bike";
        
        // 1. Check Maintenance Tasks
        const tasksSnap = await adminDb.collection("users").doc(userDoc.id).collection("bikes").doc(bikeDoc.id).collection("maintenanceTasks").get();
        
        for (const taskDoc of tasksSnap.docs) {
          const taskData = taskDoc.data();
          // Check if due by KM or Date
          let isDue = false;
          let reason = "";

          if (taskData.nextDueKm && bikeData.odometer >= taskData.nextDueKm) {
            isDue = true;
            reason = "due based on current odometer reading";
          } else if (taskData.nextDueDate) {
            const nextDate = taskData.nextDueDate.toDate ? taskData.nextDueDate.toDate() : new Date(taskData.nextDueDate);
            if (new Date() >= nextDate) {
              isDue = true;
              reason = "due based on date";
            }
          }

          if (isDue) {
            const message = {
              notification: {
                title: `${bikeName} Maintenance Due!`,
                body: `Your task "${taskData.taskName}" is ${reason}. Open BikeCare to log the service.`,
              },
              tokens: tokens,
            };
            
            try {
              await adminMessaging.sendEachForMulticast(message);
              notificationsSent++;
              // Optionally mark as notified to avoid spamming every day, but for now we keep it simple.
            } catch (err) {
              console.error("FCM Send Error:", err);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, notificationsSent });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
