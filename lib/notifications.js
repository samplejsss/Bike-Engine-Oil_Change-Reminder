import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Send a notification via three channels:
 * 1. Firestore — shows in the in-app notification bell
 * 2. SW showNotification() — IMMEDIATE OS popup (when browser is running)
 * 3. Server Web Push — OS popup delivered by push server (works even if tab closed)
 */
export async function sendNotification(userId, { title, body, type = "info", url }) {
  if (!userId || !title) return;

  // ── 1. Store in Firestore (in-app bell) ─────────────────────────────────
  try {
    await addDoc(collection(db, "users", userId, "notifications"), {
      title,
      body: body || "",
      type,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("[notify] Firestore store failed:", err.message);
  }

  // Browser-only operations below
  if (typeof window === "undefined") return;

  // ── 2. Direct SW showNotification() — always works when browser is open ──
  if ("serviceWorker" in navigator && Notification.permission === "granted") {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body: body || "",
        icon: "/icon.png",
        badge: "/icon.png",
        vibrate: [200, 100, 200],
        tag: "bikecare-" + Date.now(),
        requireInteraction: false,
        silent: false,
        data: { url: url || (typeof window !== "undefined" ? window.location.origin + "/dashboard" : "/dashboard") },
      });
      console.info("[notify] OS notification shown via SW ✅");
    } catch (err) {
      console.warn("[notify] SW showNotification failed:", err.message);
    }
  }

  // ── 3. Server Web Push (via web-push library) — works even tab is closed ──
  if ("serviceWorker" in navigator && "PushManager" in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const res = await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            title,
            body: body || "",
          }),
        });
        const data = await res.json();
        if (res.ok) {
          console.info("[notify] Server Web Push sent ✅");
        } else {
          console.warn("[notify] Server Web Push error:", data.error);
        }
      } else {
        console.info("[notify] No push subscription — user hasn't granted permission");
      }
    } catch (err) {
      console.warn("[notify] Server Web Push failed:", err.message);
    }
  }
}
