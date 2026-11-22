
import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { initFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    initFirebaseAdmin();
    const ttsClient = new TextToSpeechClient();
    
    const { voice } = await request.json();

    if (!voice) {
      return new NextResponse(JSON.stringify({ error: 'Voice parameter is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [response] = await ttsClient.synthesizeSpeech({
      input: { text: "Hello, how can I help you today?" },
      voice: { languageCode: 'en-US', name: voice },
      audioConfig: { audioEncoding: 'MP3' },
    });

    if (!response.audioContent) {
      return new NextResponse(JSON.stringify({ error: 'Failed to generate audio from Google TTS.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const audioBase64 = Buffer.from(response.audioContent).toString('base64');
    const audioDataUri = `data:audio/mp3;base64,${audioBase64}`;

    return NextResponse.json({ audioContent: audioDataUri });

  } catch (error: any) {
    console.error('Error in TTS speak route:', error);
    let errorMessage = 'An internal error occurred.';
    if (error.code === 7 || (error.message && error.message.includes('permission'))) {
        errorMessage = 'Google Text-to-Speech API is not enabled for this project. Please enable it in the Google Cloud Console.'
    }
    
    return new NextResponse(JSON.stringify({ error: errorMessage, details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
