'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoaderCircle, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const apiKeysSchema = z.object({
  twilioSid: z.string().min(1, 'Twilio SID is required.'),
  twilioToken: z.string().min(1, 'Twilio Token is required.'),
  chatGptKey: z.string().min(1, 'ChatGPT API Key is required.'),
});

type ValidationStatus = 'idle' | 'valid' | 'invalid';

interface KeyValidationStatus {
    twilio: ValidationStatus;
    chatGpt: ValidationStatus;
}

export default function ApiKeysPage() {
  const { userData, loading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [visibility, setVisibility] = useState({
    twilioSid: false,
    twilioToken: false,
    chatGptKey: false,
  });

  const [validationStatus, setValidationStatus] = useState<KeyValidationStatus>({
      twilio: 'idle',
      chatGpt: 'idle'
  });

  const form = useForm<z.infer<typeof apiKeysSchema>>({
    resolver: zodResolver(apiKeysSchema),
    values: {
      twilioSid: userData?.apiKeys?.twilioSid || '',
      twilioToken: userData?.apiKeys?.twilioToken || '',
      chatGptKey: userData?.apiKeys?.chatGptKey || '',
    },
  });
  
  useEffect(() => {
    if (userData?.apiKeys) {
      form.reset({
        twilioSid: userData.apiKeys.twilioSid || '',
        twilioToken: userData.apiKeys.twilioToken || '',
        chatGptKey: userData.apiKeys.chatGptKey || '',
      });
    }
  }, [userData, form]);


  const toggleVisibility = (key: keyof typeof visibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTestKeys = async () => {
    setIsTesting(true);
    setValidationStatus({ twilio: 'idle', chatGpt: 'idle' });
    const values = form.getValues();
    try {
      const response = await fetch('/api/keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const results = await response.json();
      if (!response.ok) {
        throw new Error(results.error || 'Failed to validate keys');
      }
      setValidationStatus({
        twilio: results.twilio ? 'valid' : 'invalid',
        chatGpt: results.chatGpt ? 'valid' : 'invalid',
      });
      toast({ title: 'Validation Complete', description: 'API key status has been updated.' });
    } catch (error: any) {
        toast({ title: 'Error', description: `Validation failed: ${error.message}`, variant: 'destructive'});
    } finally {
        setIsTesting(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof apiKeysSchema>) => {
    if (!userData) {
        toast({ title: 'Error', description: 'User not found.', variant: 'destructive' });
        return;
    }
    setIsSaving(true);
    try {
        const userRef = doc(db, 'users', userData.uid);
        await updateDoc(userRef, { apiKeys: values });
        toast({ title: 'Success', description: 'API Keys updated successfully.' });
        setValidationStatus({ twilio: 'idle', chatGpt: 'idle' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to update API Keys.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleConnectCalendar = () => {
    toast({ title: 'Coming Soon!', description: 'Google Calendar integration is not yet implemented.' });
  };
  
  const renderValidationIcon = (status: ValidationStatus) => {
    if (status === 'valid') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'invalid') return <XCircle className="h-5 w-5 text-red-500" />;
    return null;
  }


  if (loading) {
    return <div className="flex items-center justify-center h-full"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
      <h1 className="text-3xl font-bold">API Keys & Integrations</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Enter your API keys from third-party services. You can test them before saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="twilioSid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twilio SID</FormLabel>
                     <div className="relative flex items-center">
                        <FormControl>
                          <Input type={visibility.twilioSid ? "text" : "password"} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                        </FormControl>
                         <Button type="button" variant="ghost" size="icon" className="absolute right-10 h-auto p-1" onClick={() => toggleVisibility('twilioSid')}>
                            {visibility.twilioSid ? <EyeOff/> : <Eye/>}
                        </Button>
                        {renderValidationIcon(validationStatus.twilio)}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="twilioToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twilio Auth Token</FormLabel>
                    <div className="relative flex items-center">
                        <FormControl>
                        <Input type={visibility.twilioToken ? "text" : "password"} placeholder="Your Twilio auth token" {...field} />
                        </FormControl>
                        <Button type="button" variant="ghost" size="icon" className="absolute right-10 h-auto p-1" onClick={() => toggleVisibility('twilioToken')}>
                            {visibility.twilioToken ? <EyeOff/> : <Eye/>}
                        </Button>
                        {renderValidationIcon(validationStatus.twilio)}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="chatGptKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ChatGPT API Key</FormLabel>
                    <div className="relative flex items-center">
                        <FormControl>
                        <Input type={visibility.chatGptKey ? "text" : "password"} placeholder="Your ChatGPT API key" {...field} />
                        </FormControl>
                         <Button type="button" variant="ghost" size="icon" className="absolute right-10 h-auto p-1" onClick={() => toggleVisibility('chatGptKey')}>
                            {visibility.chatGptKey ? <EyeOff/> : <Eye/>}
                        </Button>
                        {renderValidationIcon(validationStatus.chatGpt)}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Save Keys
              </Button>
               <Button type="button" variant="outline" onClick={handleTestKeys} disabled={isTesting}>
                {isTesting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Test Keys
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      <Card>
          <CardHeader>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>Connect your Google Calendar to allow agents to book appointments.</CardDescription>
          </CardHeader>
          <CardContent>
            {userData?.googleCalendar?.connected ? (
                 <Alert variant="default">
                    <AlertTitle>Connected!</AlertTitle>
                    <AlertDescription>
                    Your Google Calendar is connected.
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="destructive">
                    <AlertTitle>Not Connected</AlertTitle>
                    <AlertDescription>
                    Connect your Google Calendar to enable calendar-related features.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleConnectCalendar}>
              {userData?.googleCalendar?.connected ? 'Reconnect Calendar' : 'Connect Google Calendar'}
            </Button>
          </CardFooter>
      </Card>
    </div>
  );
}
