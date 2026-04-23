"use client";
import { useEffect } from "react";
import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export default function useFcmRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    const setup = async () => {
      if (!user || typeof window === "undefined") return;
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;

      const supported = await isSupported();
      if (!supported) return;

      let permission = Notification.permission;
      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (!token) return;

      await setDoc(
        doc(db, "users", user.uid),
        {
          fcmTokens: arrayUnion(token),
          notificationsEnabled: true,
        },
        { merge: true }
      );

      onMessage(messaging, () => {
        // Foreground notifications are handled by the browser UI or app-specific toasts.
      });
    };

    setup().catch((err) => {
      console.warn("FCM setup skipped:", err?.message || err);
    });
  }, [user]);
}

