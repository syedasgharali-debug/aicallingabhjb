'use server';

/**
 * @fileOverview A flow that analyzes agent configurations and suggests improvements.
 *
 * - suggestAgentConfiguration - A function that analyzes agent configurations and suggests improvements.
 * - AgentConfigurationInput - The input type for the suggestAgentConfiguration function.
 * - AgentConfigurationOutput - The return type for the suggestAgentConfiguration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AgentConfigurationInputSchema = z.object({
  agents: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        twilioNumber: z.string(),
        prompt: z.string(),
        voice: z.string(),
      })
    )
    .describe('A list of agent configurations.'),
});
export type AgentConfigurationInput = z.infer<typeof AgentConfigurationInputSchema>;

const AgentConfigurationOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('A list of suggestions for improving agent configurations, such as resolving overlapping Twilio numbers or recommending diverse call strategies and optimized voice settings.'),
});
export type AgentConfigurationOutput = z.infer<typeof AgentConfigurationOutputSchema>;

export async function suggestAgentConfiguration(
  input: AgentConfigurationInput
): Promise<AgentConfigurationOutput> {
  return suggestAgentConfigurationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'agentConfigurationSuggestionPrompt',
  input: {schema: AgentConfigurationInputSchema},
  output: {schema: AgentConfigurationOutputSchema},
  prompt: `You are an AI assistant that analyzes agent configurations and suggests improvements for call strategies and voice settings, such as resolving overlapping Twilio numbers or recommending diverse call strategies and optimized voice settings.

Analyze the following agent configurations and provide a list of suggestions for improving agent performance and reducing inconsistencies.

Agent Configurations:
{{#each agents}}
  - Agent ID: {{id}}
    Name: {{name}}
    Twilio Number: {{twilioNumber}}
    Voice: {{voice}}
    Prompt: "{{prompt}}"
{{/each}}

If you find no issues, return an empty array for the suggestions.
`,
});

const suggestAgentConfigurationFlow = ai.defineFlow(
  {
    name: 'suggestAgentConfigurationFlow',
    inputSchema: AgentConfigurationInputSchema,
    outputSchema: AgentConfigurationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
