'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bot, LoaderCircle } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAuth = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, values.email, values.password);
      } else {
        await signInWithEmailAndPassword(auth, values.email, values.password);
      }
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.message,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
           <div className="flex justify-center items-center gap-2 mb-4">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Agent Central</h1>
          </div>
          <CardTitle className="text-2xl">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Enter your email below to create your account'
              : 'Enter your credentials to access your dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleAuth)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                {...form.register('email')}
              />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required {...form.register('password')} />
              {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>
          <div className="my-4 flex items-center">
            <div className="flex-grow border-t border-muted-foreground"></div>
            <span className="mx-2 text-xs text-muted-foreground">OR</span>
            <div className="flex-grow border-t border-muted-foreground"></div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 62.3l-68.6 68.6c-20.5-19.1-47.9-31.4-79.1-31.4-62.1 0-112.5 51.3-112.5 114.3s50.4 114.3 112.5 114.3c72.1 0 98.7-57.2 101.7-85.4H248v-69.8h239.1c1.3 12.2 2.9 24.4 2.9 36.8z"></path></svg>
            )}
            Sign in with Google
          </Button>

          <div className="mt-4 text-center text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <Button
              variant="link"
              className="pl-1"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
