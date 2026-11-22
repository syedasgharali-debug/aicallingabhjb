
import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getTwilioPhoneNumbers } from '@/lib/services';
import type { UserData } from '@/types';
import { initFirebaseAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function GET(request: Request) {
  try {
    initFirebaseAdmin();
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return new NextResponse(JSON.stringify({ error: 'Missing or invalid authorization token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const token = authorization.split('Bearer ')[1];
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    
    const userDoc = await getFirestore().collection('users').doc(uid).get();
    if (!userDoc.exists) {
        return new NextResponse(JSON.stringify({ error: 'User not found in Firestore.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    
    const userData = userDoc.data() as UserData;
    const twilioSid = userData.apiKeys?.twilioSid;
    const twilioToken = userData.apiKeys?.twilioToken;

    if (!twilioSid || !twilioToken) {
      return new NextResponse(JSON.stringify({ error: 'Twilio credentials are not set for this user.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const phoneNumbers = await getTwilioPhoneNumbers(twilioSid, twilioToken);

    return NextResponse.json({ phoneNumbers });

  } catch (error: any) {
    console.error('Error fetching Twilio numbers:', error);
    return new NextResponse(JSON.stringify({ error: 'An internal error occurred while fetching Twilio numbers.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
