"use client";
import { useEffect, useRef } from "react";
import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

const VAPID_PUBLIC_KEY =
  "BH8BfV6Oo4RrVZeHHf2hHE-zbh4AXzWvspmV8Pv37hWgDrgnOr3T7kiB2J0D7uSiWCEG_-9S2sr4t8CZE-NGy3k";

export default function useFcmRegistration() {
  const { user } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || attempted.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    attempted.current = true;

    const setup = async () => {
      try {
        // 1. Register service worker
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        // 2. Request notification permission
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }
        if (permission !== "granted") {
          console.info("[push] Permission not granted:", permission);
          return;
        }

        // 3. Get or create push subscription
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
          console.info("[push] New subscription created.");
        } else {
          console.info("[push] Existing subscription found.");
        }

        const subJSON = JSON.stringify(subscription.toJSON());

        // 4a. Save to users/{uid} (for backward compat)
        await setDoc(
          doc(db, "users", user.uid),
          { webPushSubscriptions: arrayUnion(subJSON), notificationsEnabled: true },
          { merge: true }
        );

        // 4b. Save to push_subscriptions/{uid} (public-readable, for cron without Admin SDK)
        await setDoc(
          doc(db, "push_subscriptions", user.uid),
          {
            webPushSubscriptions: arrayUnion(subJSON),
            notificationsEnabled: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        console.info("[push] Subscription saved to Firestore ✅");
      } catch (err) {
        console.warn("[push] Setup failed:", err?.message || err);
      }
    };

    const timer = setTimeout(setup, 1500);
    return () => clearTimeout(timer);
  }, [user]);
}
