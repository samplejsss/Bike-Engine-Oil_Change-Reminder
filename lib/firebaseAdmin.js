import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // We expect the service account to be a JSON string stored in Vercel environment variables
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

const adminDb = admin.apps.length ? admin.firestore() : null;
const adminMessaging = admin.apps.length ? admin.messaging() : null;

export { adminDb, adminMessaging };
