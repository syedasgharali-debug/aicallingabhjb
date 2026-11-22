'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Moon, Sun, Palette, LoaderCircle } from 'lucide-react';

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const { userData, loading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const [primaryColor, setPrimaryColor] = useState('#2563eb'); // Default blue
  const [accentColor, setAccentColor] = useState('#ec4899'); // Default pink

  useEffect(() => {
    if (userData?.theme) {
      setPrimaryColor(userData.theme.primaryColor);
      setAccentColor(userData.theme.accentColor);
    }
  }, [userData]);
  
  const handleThemeUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setIsSaving(true);
    
    try {
        const userRef = doc(db, 'users', userData.uid);
        await updateDoc(userRef, {
            theme: { primaryColor, accentColor }
        });

        // This is a simplified way to apply theme. 
        // A more robust solution might involve CSS-in-JS or more complex variable management.
        document.documentElement.style.setProperty('--primary-manual', primaryColor);
        document.documentElement.style.setProperty('--accent-manual', accentColor);

        toast({ title: 'Success', description: 'Theme updated successfully.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to update theme.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
      <h1 className="text-3xl font-bold">Appearance</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Theme Mode</CardTitle>
          <CardDescription>Select how you want the application to look.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
              <Button variant={theme === 'light' ? 'secondary' : 'outline'} onClick={() => setTheme('light')}>
                  <Sun className="mr-2" /> Light Mode
              </Button>
              <Button variant={theme === 'dark' ? 'secondary' : 'outline'} onClick={() => setTheme('dark')}>
                  <Moon className="mr-2" /> Dark Mode
              </Button>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleThemeUpdate}>
        <Card>
          <CardHeader>
            <CardTitle>Theme Colors</CardTitle>
            <CardDescription>Customize the primary and accent colors of the UI.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="primary-color" className="flex-1">Primary Color</Label>
              <div className="relative">
                 <input 
                    type="color" 
                    id="primary-color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 p-1 border rounded-md appearance-none cursor-pointer"
                 />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Label htmlFor="accent-color" className="flex-1">Accent Color</Label>
               <div className="relative">
                 <input 
                    type="color" 
                    id="accent-color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 p-1 border rounded-md appearance-none cursor-pointer"
                 />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              <Palette className="mr-2" />
              Save Theme
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
