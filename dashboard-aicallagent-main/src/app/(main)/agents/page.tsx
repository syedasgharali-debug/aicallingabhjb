
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { GOOGLE_TTS_VOICES } from '@/lib/google-voices';

// --- UI Components ---
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import type { Agent } from '@/types';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, PlusCircle, Pencil, Wand2, Info, Play, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { suggestAgentConfiguration } from '@/ai/flows/agent-configuration-suggestion';
import { Separator } from '@/components/ui/separator';
import { suggestAgentDetails } from '@/ai/flows/agent-details-suggestion';


// --- Form Schema and Types ---
const agentFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, { message: 'Agent name is required.' }),
  twilioNumber: z.string().min(1, { message: 'Please select a Twilio number.' }),
  prompt: z.string().min(10, { message: 'Prompt must be at least 10 characters.'}),
  voice: z.string().min(1, { message: 'Please select a voice.' }),
});

interface TwilioNumber {
  sid: string;
  phoneNumber: string;
}

// --- Main Page Component ---
export default function AgentsPage() {
  const { userData } = useAuth();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const [twilioNumbers, setTwilioNumbers] = useState<TwilioNumber[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const [businessName, setBusinessName] = useState('');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isVoicePlaying, setIsVoicePlaying] = useState(false);

  const form = useForm<z.infer<typeof agentFormSchema>>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: '',
      twilioNumber: '',
      prompt: 'You are a helpful and friendly AI assistant. Keep your responses concise and to the point.',
      voice: '',
    },
  });
  
  // Effect to populate form when editing an agent
  useEffect(() => {
    if (editingAgent) {
        form.reset(editingAgent);
        setIsModalOpen(true);
    } else {
        form.reset({
            name: '',
            twilioNumber: '',
            prompt: 'You are a helpful and friendly AI assistant. Keep your responses concise and to the point.',
            voice: '',
        });
    }
  }, [editingAgent, form]);

  // Effect to fetch dropdown data when modal opens
  useEffect(() => {
    const fetchDropdownData = async () => {
      if (!userData || !isModalOpen) return;
      
      if (!userData.apiKeys?.twilioSid) {
        toast({ title: 'API Keys Missing', description: 'Please set your Twilio API keys before creating an agent.', variant: 'destructive' });
        setIsModalOpen(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const twilioRes = await fetch('/api/twilio/numbers');

        if (!twilioRes.ok) {
          const errorData = await twilioRes.json().catch(() => ({ error: 'Failed to fetch Twilio numbers.' }));
          throw new Error(errorData.error);
        }
        const twilioData = await twilioRes.json();
        setTwilioNumbers(Array.isArray(twilioData.phoneNumbers) ? twilioData.phoneNumbers : []);

      } catch (err: any) {
        setError(err.message);
        toast({ title: 'Error', description: err.message, variant: 'destructive'});
      } finally {
        setIsLoading(false);
      }
    };

    fetchDropdownData();
  }, [userData, isModalOpen, toast]);

  const handleModalOpenChange = (isOpen: boolean) => {
    setIsModalOpen(isOpen);
    if (!isOpen) {
        setEditingAgent(null); // Reset editing state when modal closes
    }
  }

  const onSubmit = async (values: z.infer<typeof agentFormSchema>) => {
    if (!userData) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', userData.uid);
      if (editingAgent) {
        // Update existing agent
        const updatedAgents = userData.agents.map(agent => 
            agent.id === editingAgent.id ? { ...agent, ...values } : agent
        );
        await updateDoc(userRef, { agents: updatedAgents });
        toast({ title: 'Success', description: 'Agent updated successfully.' });
      } else {
        // Create new agent
        const newAgent: Agent = { id: crypto.randomUUID(), ...values };
        await updateDoc(userRef, {
            agents: arrayUnion(newAgent),
        });
        toast({ title: 'Success', description: 'New agent created.' });
      }
      
      form.reset();
      handleModalOpenChange(false);

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save agent.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleGetSuggestions = async () => {
    if (!userData || !userData.agents || userData.agents.length === 0) {
        toast({ title: 'No Agents', description: 'Create at least one agent to get suggestions.', variant: 'destructive'});
        return;
    }
    setIsSuggesting(true);
    setSuggestions([]);
    try {
        const result = await suggestAgentConfiguration({ agents: userData.agents });
        setSuggestions(result.suggestions);
        setIsSuggestionModalOpen(true);
    } catch (error: any) {
        toast({ title: 'Error', description: `Failed to get AI suggestions: ${error.message}`, variant: 'destructive'});
    } finally {
        setIsSuggesting(false);
    }
  }

  const handleGenerateDetails = async () => {
    if (!businessName || !topic) {
        toast({ title: 'Missing Info', description: 'Please provide a business name and topic.', variant: 'destructive'});
        return;
    }
    setIsGenerating(true);
    try {
        const result = await suggestAgentDetails({ businessName, topic });
        form.setValue('name', result.agentName);
        form.setValue('prompt', result.prompt);
        toast({ title: 'Details Generated', description: 'Agent name and prompt have been populated.'});
    } catch (error: any) {
        toast({ title: 'Error', description: `Failed to generate details: ${error.message}`, variant: 'destructive' });
    } finally {
        setIsGenerating(false);
    }
  };

  const handlePlayVoice = async () => {
    const selectedVoice = form.getValues('voice');
    if (!selectedVoice) {
      toast({ title: 'No Voice Selected', description: 'Please select a voice to preview.', variant: 'destructive' });
      return;
    }
    setIsVoicePlaying(true);
    try {
        const response = await fetch('/api/tts/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voice: selectedVoice })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate voice sample.');
        }
        const data = await response.json();
        const audio = new Audio(data.audioContent);
        audio.play();
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive'});
    } finally {
        setIsVoicePlaying(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agents</h1>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGetSuggestions} disabled={isSuggesting}>
                {isSuggesting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Get AI Suggestions
            </Button>
            <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Agent
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                <DialogTitle>{editingAgent ? 'Edit Agent' : 'Create a New Agent'}</DialogTitle>
                <DialogDescription>
                    {editingAgent ? 'Update the details for your AI agent.' : 'Configure a new AI agent for your call center.'}
                </DialogDescription>
                </DialogHeader>
                
                {error && <div className="text-red-500 p-3 bg-red-100/80 border border-red-400 rounded-md text-sm">{error}</div>}

                <div className='space-y-4 bg-muted/80 p-4 rounded-lg border'>
                    <div className='flex items-center gap-2'>
                        <Sparkles className='h-5 w-5 text-primary' />
                        <h3 className='font-semibold'>Generate with AI</h3>
                    </div>
                    <p className='text-sm text-muted-foreground'>
                        Provide some details and let AI generate the agent's name and prompt for you.
                    </p>
                    <div className='grid grid-cols-2 gap-4'>
                        <Input 
                            placeholder='Business Name (e.g., "Dental Smiles")' 
                            value={businessName} 
                            onChange={(e) => setBusinessName(e.target.value)} 
                        />
                        <Input 
                            placeholder='Topic (e.g., "Booking")' 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)} 
                        />
                    </div>
                    <Button 
                        type='button' 
                        variant='secondary' 
                        className='w-full'
                        onClick={handleGenerateDetails}
                        disabled={isGenerating}
                    >
                        {isGenerating && <LoaderCircle className='animate-spin mr-2'/>}
                        Generate Details
                    </Button>
                </div>
                

                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                    
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Agent Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Sales Bot" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>System Prompt</FormLabel>
                        <FormControl>
                            <Textarea placeholder="You are a helpful AI assistant..." className="h-32" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <div className="grid grid-cols-1 gap-4">
                        <FormField
                        control={form.control}
                        name="twilioNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Twilio Phone Number</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={isLoading}
                            >
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoading ? "Loading..." : "Select a number"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {twilioNumbers.map((number) => (
                                    <SelectItem key={number.sid} value={number.phoneNumber}>
                                    {number.phoneNumber}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                         <FormField
                            control={form.control}
                            name="voice"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Agent Voice</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a voice"/>
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {GOOGLE_TTS_VOICES.map((voice) => (
                                            <SelectItem key={voice.name} value={voice.name}>
                                            {voice.name} ({voice.gender})
                                            </SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <Button type="button" variant="outline" size="icon" onClick={handlePlayVoice} disabled={isVoicePlaying}>
                                        {isVoicePlaying ? <LoaderCircle className="animate-spin" /> : <Play />}
                                    </Button>
                                </div>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>


                    <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSaving || isLoading}>
                        {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/>}
                        {editingAgent ? 'Save Changes' : 'Save Agent'}
                    </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        </div>
      </div>
      
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userData?.agents && userData.agents.length > 0 ? (
          userData.agents.map((agent) => (
            <div key={agent.id} className="border p-4 rounded-lg shadow-sm flex flex-col">
                <div className="flex-grow">
                    <h3 className="font-bold text-lg">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.twilioNumber}</p>
                    <p className="text-xs text-muted-foreground mt-2">Voice: {agent.voice}</p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">Prompt: {agent.prompt}</p>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEditingAgent(agent)}>
                        <Pencil className="mr-2 h-3 w-3" />
                        Edit
                    </Button>
                </div>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground col-span-3 text-center mt-10">No agents created yet. Click "Create New Agent" to get started.</p>
        )}
      </div>

       {/* AI Suggestions Modal */}
       <Dialog open={isSuggestionModalOpen} onOpenChange={setIsSuggestionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI-Powered Suggestions</DialogTitle>
            <DialogDescription>
              Here are some suggestions from our AI to improve your agent configurations.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {suggestions.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5 text-sm text-foreground">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            ) : (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>All Good!</AlertTitle>
                    <AlertDescription>
                        The AI didn't find any specific issues to report. Your agent setup looks solid.
                    </AlertDescription>
                </Alert>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
