'use server';

/**
 * @fileOverview A flow for transcribing audio using Google Cloud Speech-to-Text.
 *
 * - transcribeAudio - Transcribes the given audio data.
 * - TranscribeInput - The input type for the transcribeAudio function.
 * - TranscribeOutput - The return type for the transcribeAudio function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { SpeechClient } from '@google-cloud/speech';

const TranscribeInputSchema = z.object({
    audio: z.string().describe('The base64-encoded audio data.'),
});
export type TranscribeInput = z.infer<typeof TranscribeInputSchema>;

const TranscribeOutputSchema = z.object({
    text: z.string().describe('The transcribed text.'),
});
export type TranscribeOutput = z.infer<typeof TranscribeOutputSchema>;

const speechClient = new SpeechClient();

const transcribeFlow = ai.defineFlow(
  {
    name: 'transcribeFlow',
    inputSchema: TranscribeInputSchema,
    outputSchema: TranscribeOutputSchema,
  },
  async (input) => {
    const [response] = await speechClient.recognize({
      audio: {
        content: input.audio,
      },
      config: {
        encoding: 'MULAW',
        sampleRateHertz: 8000,
        languageCode: 'en-US',
      },
    });

    const transcription = response.results
      ?.map((result) => result.alternatives?.[0].transcript)
      .join('\n');
      
    return { text: transcription || '' };
  }
);

export async function transcribeAudio(input: TranscribeInput): Promise<TranscribeOutput> {
  return transcribeFlow(input);
}
