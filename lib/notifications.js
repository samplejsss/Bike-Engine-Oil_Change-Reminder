import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Save a notification to Firestore for a specific user.
 * Also sends a Web Push notification to all their subscriptions.
 */
export async function sendNotification(userId, { title, body, type = "info" }) {
  if (!userId || !title) return;

  // 1. Store in Firestore for in-app notification center
  try {
    await addDoc(collection(db, "users", userId, "notifications"), {
      title,
      body: body || "",
      type,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to store notification:", err);
  }

  // 2. Attempt to send a Web Push notification (best-effort, non-blocking)
  try {
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, body }),
    });
    if (!res.ok) {
      const data = await res.json();
      console.warn("Web push failed:", data.error);
    }
  } catch (err) {
    console.warn("Web push request failed:", err.message);
  }
}
