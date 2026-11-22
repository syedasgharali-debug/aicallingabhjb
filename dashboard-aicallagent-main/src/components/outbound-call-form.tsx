'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
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
import { Button } from '@/components/ui/button';
import { LoaderCircle, PhoneOutgoing } from 'lucide-react';
import { useState } from 'react';

const outboundCallSchema = z.object({
  phoneNumber: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  agentId: z.string().min(1, { message: 'Please select an agent.' }),
});

export function OutboundCallForm() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [isCalling, setIsCalling] = useState(false);

  const form = useForm<z.infer<typeof outboundCallSchema>>({
    resolver: zodResolver(outboundCallSchema),
    defaultValues: {
      phoneNumber: '',
      agentId: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof outboundCallSchema>) => {
    setIsCalling(true);
    try {
      const response = await fetch('/api/call/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate call.');
      }

      toast({ title: 'Success', description: 'Outbound call initiated.' });
      form.reset();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCalling(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="+15551234567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="agentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Agent</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent to make the call" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {userData?.agents && userData.agents.length > 0 ? (
                    userData.agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.twilioNumber})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No agents available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isCalling}>
          {isCalling ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PhoneOutgoing className="mr-2 h-4 w-4" />
          )}
          {isCalling ? 'Placing Call...' : 'Place Call'}
        </Button>
      </form>
    </Form>
  );
}
