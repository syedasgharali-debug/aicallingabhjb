
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Twilio } from 'twilio';
import type { UserData, Agent } from '@/types';
import { initFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: Request) {
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
      return new NextResponse(JSON.stringify({ error: 'User not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const userData = userDoc.data() as UserData;
    const { twilioSid, twilioToken } = userData.apiKeys;

    if (!twilioSid || !twilioToken) {
      return new NextResponse(JSON.stringify({ error: 'Twilio credentials are not set.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { phoneNumber, agentId } = await request.json();
    if (!phoneNumber || !agentId) {
        return new NextResponse(JSON.stringify({ error: 'Phone number and agent ID are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const agent = userData.agents.find(a => a.id === agentId);
    if (!agent) {
        return new NextResponse(JSON.stringify({ error: 'Agent not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    
    const client = new Twilio(twilioSid, twilioToken);
    
    const host = request.headers.get('host');
    const websocketUrl = `wss://${host}/api/call`;

    // The TwiML tells Twilio to connect the call to a WebSocket stream.
    // We are also passing all the necessary information as custom parameters to the stream.
    const twiml = `
<Response>
  <Connect>
    <Stream url="${websocketUrl}?userId=${uid}&agentId=${agent.id}">
        <Parameter name="userId" value="${uid}" />
        <Parameter name="agentId" value="${agent.id}" />
        <Parameter name="to" value="${phoneNumber}" />
        <Parameter name="from" value="${agent.twilioNumber}" />
    </Stream>
  </Connect>
</Response>
`.trim();


    await client.calls.create({
      twiml: twiml,
      to: phoneNumber,
      from: agent.twilioNumber,
    });
    
    return NextResponse.json({ message: 'Call initiated successfully' });

  } catch (error: any) {
    console.error('Error initiating outbound call:', error);
    return new NextResponse(JSON.stringify({ error: 'An internal error occurred.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
