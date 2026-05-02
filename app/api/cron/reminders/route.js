export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { getWebPush } from "@/lib/webPush";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── Firestore REST helpers ──────────────────────────────────────────────────
function parseValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return new Date(v.timestampValue);
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(parseValue);
  if (v.mapValue !== undefined) return parseFields(v.mapValue.fields || {});
  if (v.nullValue !== undefined) return null;
  return null;
}

function parseFields(fields = {}) {
  const obj = {};
  for (const [k, v] of Object.entries(fields)) obj[k] = parseValue(v);
  return obj;
}

async function firestoreGet(path) {
  const url = `${BASE}/${path}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const doc = await res.json();
  return doc.fields ? parseFields(doc.fields) : null;
}

async function firestoreList(collection) {
  const url = `${BASE}/${collection}?key=${API_KEY}&pageSize=300`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || []).map((doc) => ({
    id: doc.name.split('/').pop(),
    ...parseFields(doc.fields || {}),
  }));
}

// Write a notification using Firestore REST (no admin needed)
async function writeNotification(userId, { title, body, type = "info" }) {
  const url = `${BASE}/users/${userId}/notifications?key=${API_KEY}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        title: { stringValue: title },
        body: { stringValue: body || '' },
        type: { stringValue: type },
        read: { booleanValue: false },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
}

// ─── Main notify helper ──────────────────────────────────────────────────────
async function notify(userId, webPushSubscriptions = [], { title, body, type = "info" }) {
  // 1. Write to Firestore in-app notification center
  await writeNotification(userId, { title, body, type });

  // 2. Send Web Push to all subscriptions
  if (!webPushSubscriptions.length) return;
  let wp;
  try { wp = getWebPush(); } catch (e) {
    console.warn("[cron] VAPID not configured:", e.message); return;
  }
  const payload = JSON.stringify({ title, body });
  for (const subStr of webPushSubscriptions) {
    try {
      await wp.sendNotification(JSON.parse(subStr), payload);
    } catch (err) {
      if (err.statusCode !== 410 && err.statusCode !== 404)
        console.error("[cron] push error:", err.message);
    }
  }
}

// ─── Cron Handler ─────────────────────────────────────────────────────────────
export async function GET(request) {
  if (process.env.NODE_ENV === 'production') {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!PROJECT_ID || !API_KEY) {
    return NextResponse.json({ error: "Firebase project env vars missing" }, { status: 500 });
  }

  try {
    // Read push subscriptions from the public push_subscriptions collection
    const configs = await firestoreList("push_subscriptions");
    let notificationsSent = 0;

    for (const cfg of configs) {
      const userId = cfg.id;
      const subs = cfg.webPushSubscriptions || [];
      if (cfg.notificationsEnabled === false) continue;

      // Read bikes from users/{userId}/bikes
      const bikes = await firestoreList(`users/${userId}/bikes`);

      for (const bike of bikes) {
        const bikeName = bike.name || "Your Bike";
        const currentOdometer = bike.lastOdometerReading || 0;
        const oilChangeInterval = bike.oilChangeInterval || 2000;
        const lastResetKm = bike.lastResetKm || 0;
        const kmSinceChange = Math.max(0, currentOdometer - lastResetKm);
        const kmRemaining = Math.max(0, oilChangeInterval - kmSinceChange);

        // 1. Daily oil status
        await notify(userId, subs, {
          title: `🛢️ ${bikeName} Daily Oil Status`,
          body: kmRemaining <= 0
            ? `Oil change OVERDUE! You've ridden ${kmSinceChange.toFixed(0)} km since last change.`
            : `${kmRemaining.toFixed(0)} km remaining until next oil change. Ride safe!`,
          type: kmRemaining <= 0 ? "alert" : "oil",
        });
        notificationsSent++;

        // 2. Urgent oil (< 200km)
        if (kmRemaining > 0 && kmRemaining <= 200) {
          await notify(userId, subs, {
            title: `⚠️ Oil Change Due Soon – ${bikeName}`,
            body: `Only ${kmRemaining.toFixed(0)} km left! Book your service now.`,
            type: "alert",
          });
          notificationsSent++;
        }

        // 3. Maintenance tasks
        const tasks = await firestoreList(`users/${userId}/bikes/${bike.id}/maintenanceTasks`);
        for (const task of tasks) {
          let isDue = false, reason = "";
          if (task.nextDueKm && currentOdometer >= task.nextDueKm) {
            isDue = true;
            reason = `odometer ${currentOdometer} km reached due point ${task.nextDueKm} km`;
          } else if (task.nextDueDate) {
            const nextDate = task.nextDueDate instanceof Date ? task.nextDueDate : new Date(task.nextDueDate);
            const daysLeft = Math.ceil((nextDate - new Date()) / 86400000);
            if (daysLeft <= 0) {
              isDue = true;
              reason = `was due on ${nextDate.toLocaleDateString("en-IN")}`;
            } else if (daysLeft <= 3) {
              await notify(userId, subs, {
                title: `🔧 "${task.taskName}" due in ${daysLeft} day(s)`,
                body: `Upcoming for ${bikeName}. Schedule before ${nextDate.toLocaleDateString("en-IN")}.`,
                type: "maintenance",
              });
              notificationsSent++;
            }
          }
          if (isDue) {
            await notify(userId, subs, {
              title: `🔧 ${bikeName} Maintenance Due!`,
              body: `"${task.taskName}" ${reason}. Open BikeCare to log it.`,
              type: "maintenance",
            });
            notificationsSent++;
          }
        }

        // 4. Document expiry
        const docs = await firestoreList(`users/${userId}/bikes/${bike.id}/documents`);
        for (const d of docs) {
          if (!d.expiryDate) continue;
          const expiry = d.expiryDate instanceof Date ? d.expiryDate : new Date(d.expiryDate);
          const daysLeft = Math.ceil((expiry - new Date()) / 86400000);
          if (daysLeft > 0 && daysLeft <= 30) {
            await notify(userId, subs, {
              title: `📄 ${d.type || "Document"} Expiring in ${daysLeft} days`,
              body: `"${d.fileName}" for ${bikeName} expires ${expiry.toLocaleDateString("en-IN")}. Renew now!`,
              type: "alert",
            });
            notificationsSent++;
          } else if (daysLeft <= 0) {
            await notify(userId, subs, {
              title: `📄 ${d.type || "Document"} EXPIRED`,
              body: `"${d.fileName}" for ${bikeName} has expired. Renew immediately!`,
              type: "alert",
            });
            notificationsSent++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, notificationsSent, usersProcessed: configs.length });
  } catch (error) {
    console.error("[cron] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
