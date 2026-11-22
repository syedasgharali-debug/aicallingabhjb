
'use server';

/**
 * @fileOverview This flow orchestrates the AI conversation, taking transcribed text,
 * generating a response from OpenAI, and synthesizing it into speech with Google.
 * The output audio is in a Twilio-compatible format.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import OpenAI from 'openai';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';


const ConversationInputSchema = z.object({
  text: z.string().describe('The transcribed text from the user.'),
  chatGptKey: z.string().describe('The OpenAI API key.'),
  streamSid: z.string().describe('The Twilio Stream SID.'),
  prompt: z.string().describe('The system prompt for the agent.'),
  voice: z.string().describe('The Google Cloud TTS voice.'),
});
export type ConversationInput = z.infer<typeof ConversationInputSchema>;


const ConversationOutputSchema = z.object({
  textResponse: z.string().describe('The text response from the AI model.'),
  audioPayload: z.string().describe('The generated and base64-encoded audio payload for Twilio.'),
});
export type ConversationOutput = z.infer<typeof ConversationOutputSchema>;

const ttsClient = new TextToSpeechClient();

const conversationFlow = ai.defineFlow(
  {
    name: 'conversationFlow',
    inputSchema: ConversationInputSchema,
    outputSchema: ConversationOutputSchema,
  },
  async (input) => {
    const openai = new OpenAI({ apiKey: input.chatGptKey });

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: input.prompt },
        { role: 'user', content: input.text }
    ],
      model: 'gpt-4o',
    });

    const textResponse = completion.choices[0].message.content;

    if (!textResponse) {
      throw new Error('No response from OpenAI.');
    }

    const [ttsResponse] = await ttsClient.synthesizeSpeech({
        input: { text: textResponse },
        voice: { languageCode: 'en-US', name: input.voice },
        audioConfig: { 
            audioEncoding: 'MULAW',
            sampleRateHertz: 8000,
        },
    });

    if (!ttsResponse.audioContent) {
        throw new Error('No audio content from Google Text-to-Speech.');
    }

    const audioPayload = Buffer.from(ttsResponse.audioContent).toString('base64');
    
    return { textResponse, audioPayload };
  }
);


export async function runConversation(input: ConversationInput): Promise<ConversationOutput> {
    return conversationFlow(input);
}
