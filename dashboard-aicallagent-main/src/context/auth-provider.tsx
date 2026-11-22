'use client';

import { createContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserData, AuthContextType } from '@/types';

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  signOut: async () => {},
});


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This effect handles user authentication state changes.
    let unsubscribeSnapshot: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeSnapshot(); // Stop listening to the previous user's data

      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeSnapshot = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            setUserData(data);
            if (data.theme) {
                // Apply theme colors from user data
                document.documentElement.style.setProperty('--primary-manual', data.theme.primaryColor);
                document.documentElement.style.setProperty('--accent-manual', data.theme.accentColor);
            }
          } else {
            // Create a new user document if it doesn't exist
            const newUserData: UserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              apiKeys: {
                twilioSid: '',
                twilioToken: '',
                chatGptKey: '',
              },
              agents: [],
              googleCalendar: {
                connected: false,
                refreshToken: '',
              },
            };
            try {
              await setDoc(userRef, newUserData);
            } catch (error) {
              console.error("Error creating user document:", error);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore snapshot error:", error);
          setUserData(null);
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    // Cleanup function to unsubscribe from listener
    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, []);

  useEffect(() => {
    // This effect runs only on the client-side to override fetch.
    const originalFetch = window.fetch;
    let tokenCache: string | null = null;
    let tokenCacheTime: number | null = null;

    window.fetch = async (...args) => {
        let [url, config] = args;
        const isApiRoute = typeof url === 'string' && url.startsWith('/api/');
    
        if (isApiRoute && auth.currentUser) {
            let token;
            const now = Date.now();
            // Use cached token if it's less than 5 minutes old
            if (tokenCache && tokenCacheTime && (now - tokenCacheTime < 5 * 60 * 1000)) {
                token = tokenCache;
            } else {
                token = await auth.currentUser.getIdToken(true);
                tokenCache = token;
                tokenCacheTime = now;
            }
    
            const headers = new Headers(config?.headers);
            headers.set('Authorization', `Bearer ${token}`);
            config = { ...config, headers };
        }
        
        return originalFetch(url, config);
    };

    // Cleanup function to restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [user]); // Rerun when user changes

  const signOut = async () => {
    await auth.signOut();
  };
  
  const value = { user, userData, loading, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
