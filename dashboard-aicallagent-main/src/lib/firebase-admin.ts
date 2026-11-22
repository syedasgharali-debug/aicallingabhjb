import * as admin from 'firebase-admin';

export function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  try {
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      // Use application default credentials if the env var is not set.
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } catch (e: any) {
    console.error('Failed to initialize Firebase Admin SDK:', e.message);
    // Propagate the error to make it visible in the logs
    throw new Error(`Firebase Admin SDK initialization failed: ${e.message}`);
  }
}
