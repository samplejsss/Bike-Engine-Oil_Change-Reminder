import webpush from 'web-push';

let initialized = false;

export function getWebPush() {
  if (!initialized) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      throw new Error(`VAPID keys missing. PUBLIC=${!!publicKey} PRIVATE=${!!privateKey}`);
    }

    webpush.setVapidDetails('mailto:support@bikecaretracker.com', publicKey, privateKey);
    initialized = true;
  }
  return webpush;
}

// Re-export for legacy usage
export { webpush };
