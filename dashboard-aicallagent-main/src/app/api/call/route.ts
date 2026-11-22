
import {NextRequest, NextResponse} from 'next/server';
import {WebSocketServer, WebSocket} from 'ws';
import {Twilio} from 'twilio';
import {runConversation} from '@/ai/flows/conversation';
import { transcribeAudio } from '@/ai/flows/transcribe';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, addDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import type { UserData, Agent } from '@/types';
import { initFirebaseAdmin } from '@/lib/firebase-admin';

// This is a temporary workaround to attach the WebSocket server to the global object
// in a development environment. In a production environment, you'd want a more robust solution.
if (!global.wss) {
  global.wss = new WebSocketServer({noServer: true});

  global.wss.on('connection', (ws, req) => {
    console.log('WebSocket connected');
    let callLogId: string;
    initFirebaseAdmin();

    ws.on('message', async (message: string) => {
      const msg = JSON.parse(message);

      switch (msg.event) {
        case 'start':
          console.log('Twilio media stream started', msg.start);
          const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
          const agentId = urlParams.get('agentId');
          const userId = urlParams.get('userId');
          const callSid = msg.start.callSid;

          if (!agentId || !userId) {
              console.error('Missing agentId or userId');
              return;
          }

          try {
              const userRef = doc(db, 'users', userId);
              const userSnap = await getDoc(userRef);
              if (!userSnap.exists()) {
                  console.error('User not found');
                  return;
              }
              const userData = userSnap.data() as UserData;
              const agent = userData.agents.find(a => a.id === agentId);
              
              const newCallLog = {
                  userId,
                  agentId,
                  agentName: agent?.name || 'Unknown',
                  callSid,
                  streamSid: msg.streamSid,
                  from: msg.start.customParameters?.from || 'Unknown',
                  to: msg.start.customParameters?.to || 'Unknown',
                  startTime: serverTimestamp(),
                  status: 'in-progress',
                  transcript: [],
              };
              const docRef = await addDoc(collection(db, "callLogs"), newCallLog);
              callLogId = docRef.id;
              console.log('Created call log with ID:', callLogId);

          } catch(error) {
            console.error('Error creating call log:', error);
          }
          break;
        case 'media':
          const audioPayload = msg.media.payload;
          const { text: transcribedText } = await transcribeAudio({ audio: audioPayload });
          
          if (!transcribedText || !callLogId) {
              return;
          }

          const callLogRef = doc(db, 'callLogs', callLogId);
          await updateDoc(callLogRef, {
            transcript: arrayUnion({
              speaker: 'user',
              text: transcribedText,
              timestamp: new Date().toISOString(),
            })
          });

          console.log(`Transcription: ${transcribedText}`);
          
          const conversationUrl = new URL(req.url, `http://${req.headers.host}`);
          const convAgentId = conversationUrl.searchParams.get('agentId');
          const convUserId = conversationUrl.searchParams.get('userId');

          if (!convAgentId || !convUserId) {
              console.error('Missing agentId or userId in WebSocket URL');
              return;
          }
          
          try {
            const userRef = doc(db, 'users', convUserId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                console.error('User not found');
                return;
            }
            const userData = userSnap.data() as UserData;
            const agent = userData.agents.find(a => a.id === convAgentId);

            if (!agent) {
                console.error('Agent not found');
                return;
            }
            
            const { chatGptKey } = userData.apiKeys;

            const { textResponse, audioPayload: responseAudioPayload } = await runConversation({
                text: transcribedText,
                chatGptKey,
                streamSid: msg.streamSid,
                prompt: agent.prompt,
                voice: agent.voice
            });

            await updateDoc(callLogRef, {
                transcript: arrayUnion({
                  speaker: 'agent',
                  text: textResponse,
                  timestamp: new Date().toISOString(),
                })
              });
            
            ws.send(JSON.stringify({
                event: 'media',
                streamSid: msg.streamSid,
                media: {
                    payload: responseAudioPayload,
                },
            }));
            
            // Send a mark message to indicate the end of the agent's turn
            ws.send(JSON.stringify({
                event: 'mark',
                streamSid: msg.streamSid,
                mark: {
                    name: 'agent-turn-end',
                },
            }));

          } catch (error) {
            console.error('Error processing conversation:', error);
          }
          break;
        case 'stop':
            console.log('Twilio media stream stopped');
            if (callLogId) {
                const callLogRef = doc(db, 'callLogs', callLogId);
                const callLogSnap = await getDoc(callLogRef);
                if (callLogSnap.exists()) {
                    const callData = callLogSnap.data();
                    const startTime = (callData.startTime.toDate() as Date).getTime();
                    const endTime = new Date().getTime();
                    const duration = endTime - startTime;
                    await updateDoc(callLogRef, {
                        status: 'completed',
                        endTime: serverTimestamp(),
                        duration: duration
                    });
                }
            }
            ws.close();
            break;
      }
    });

    ws.on('close', () => {
      console.log('WebSocket disconnected');
    });
  });
}

async function findUserAndAgentByTwilioNumber(phoneNumber: string): Promise<{ userData: UserData; agent: Agent } | null> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('agents', '!=', []));
    const querySnapshot = await getDocs(q);
  
    for (const doc of querySnapshot.docs) {
      const userData = doc.data() as UserData;
      if (userData.agents) {
        const agent = userData.agents.find(a => a.twilioNumber === phoneNumber);
        if (agent) {
          return { userData: {...userData, uid: doc.id}, agent };
        }
      }
    }
  
    return null;
}

export async function POST(req: NextRequest) {
  initFirebaseAdmin();
  const body = await req.formData();
  const to = body.get('To') as string | null;
  const from = body.get('From') as string | null;

  if (!to || !from) {
      return new NextResponse('Missing "To" or "From" number.', { status: 400 });
  }

  const result = await findUserAndAgentByTwilioNumber(to);

  if (!result) {
    const twiml = new Twilio.twiml.VoiceResponse();
    twiml.say('We could not find an agent for this number. Please check your configuration.');
    twiml.hangup();
    return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }

  const { userData, agent } = result;

  const twiml = new Twilio.twiml.VoiceResponse();
  const connect = twiml.connect();
  const stream = connect.stream({
    url: `wss://${req.headers.get('host')}/api/call?userId=${userData.uid}&agentId=${agent.id}`,
  });

  return new NextResponse(twiml.toString(), {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
