
'use server';

/**
 * @fileOverview A flow that generates agent details (name and prompt) based on business context.
 *
 * - suggestAgentDetails - A function that generates an agent name and system prompt.
 * - AgentDetailsInput - The input type for the suggestAgentDetails function.
 * - AgentDetailsOutput - The return type for the suggestAgentDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AgentDetailsInputSchema = z.object({
  businessName: z.string().describe('The name of the business.'),
  topic: z.string().describe('The primary topic or purpose of the agent (e.g., "appointment booking", "customer support", "sales inquiry").'),
});
export type AgentDetailsInput = z.infer<typeof AgentDetailsInputSchema>;

const AgentDetailsOutputSchema = z.object({
  agentName: z.string().describe('A short, descriptive name for the agent.'),
  prompt: z.string().describe('A detailed system prompt for the AI agent.'),
});
export type AgentDetailsOutput = z.infer<typeof AgentDetailsOutputSchema>;

export async function suggestAgentDetails(
  input: AgentDetailsInput
): Promise<AgentDetailsOutput> {
  return suggestAgentDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'agentDetailsSuggestionPrompt',
  input: {schema: AgentDetailsInputSchema},
  output: {schema: AgentDetailsOutputSchema},
  prompt: `You are an expert in designing AI conversational agents. Your task is to generate a creative and relevant agent name and a comprehensive system prompt based on a business name and a topic.

Business Name: "{{businessName}}"
Topic: "{{topic}}"

**Agent Name Guidelines:**
- The name should be short, professional, and easy to remember.
- It should reflect its purpose (e.g., "Booking Bot", "Support Assistant", "Sales Helper").

**System Prompt Guidelines:**
- The prompt should clearly define the agent's identity and role.
- It should establish a persona (e.g., friendly, professional, empathetic).
- It must provide clear instructions and constraints on what the agent should and should not do.
- Include example phrases or conversation starters.
- Keep the prompt detailed and specific to the business and topic.

Generate the agent name and prompt.
`,
});

const suggestAgentDetailsFlow = ai.defineFlow(
  {
    name: 'suggestAgentDetailsFlow',
    inputSchema: AgentDetailsInputSchema,
    outputSchema: AgentDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
