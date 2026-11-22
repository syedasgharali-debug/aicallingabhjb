import { NextResponse } from 'next/server';
import { Twilio } from 'twilio';
import OpenAI from 'openai';
import type { ApiKeys } from '@/types';
import { initFirebaseAdmin } from '@/lib/firebase-admin';

async function validateTwilio(sid: string, token: string): Promise<boolean> {
  try {
    const client = new Twilio(sid, token);
    // A simple check is to try fetching account details
    await client.api.v2010.accounts(sid).fetch();
    return true;
  } catch (error) {
    console.error('Twilio validation failed:', error);
    return false;
  }
}

async function validateChatGPT(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({ apiKey });
    // A simple check is to list available models
    await openai.models.list();
    return true;
  } catch (error) {
    console.error('ChatGPT validation failed:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    initFirebaseAdmin();
    const { twilioSid, twilioToken, chatGptKey } = (await request.json()) as ApiKeys;

    if (!twilioSid || !twilioToken || !chatGptKey) {
      return new NextResponse(JSON.stringify({ error: 'Missing one or more API keys.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const [twilioValid, chatGptValid] = await Promise.all([
      validateTwilio(twilioSid, twilioToken),
      validateChatGPT(chatGptKey),
    ]);

    return NextResponse.json({
      twilio: twilioValid,
      chatGpt: chatGptValid,
    });

  } catch (error: any) {
    console.error('Error validating keys:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
