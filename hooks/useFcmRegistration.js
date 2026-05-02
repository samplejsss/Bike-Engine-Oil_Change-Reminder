"use client";
import { useEffect } from "react";
import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

// Utility to convert Base64 string to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function useFcmRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    const setup = async () => {
      if (!user || typeof window === "undefined" || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      let permission = Notification.permission;
      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      
      const publicVapidKey = 'BH8BfV6Oo4RrVZeHHf2hHE-zbh4AXzWvspmV8Pv37hWgDrgnOr3T7kiB2J0D7uSiWCEG_-9S2sr4t8CZE-NGy3k';

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
      }

      // Store the subscription in Firestore as a serialized string
      const subJSON = JSON.stringify(subscription);
      await setDoc(
        doc(db, "users", user.uid),
        {
          webPushSubscriptions: arrayUnion(subJSON),
          notificationsEnabled: true,
        },
        { merge: true }
      );
    };

    setup().catch((err) => {
      console.warn("Web Push setup skipped:", err?.message || err);
    });
  }, [user]);
}

