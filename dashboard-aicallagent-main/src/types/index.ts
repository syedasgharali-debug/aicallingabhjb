
import type { User as FirebaseUser } from 'firebase/auth';

export interface Agent {
  id: string;
  name: string;
  twilioNumber: string;
  prompt: string;
  voice: string;
}

export interface ApiKeys {
  twilioSid: string;
  twilioToken: string;
  chatGptKey: string;
}

export interface GoogleCalendar {
  connected: boolean;
  refreshToken: string;
}

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  apiKeys: ApiKeys;
  agents: Agent[];
  googleCalendar: GoogleCalendar;
  theme?: {
    primaryColor: string;
    accentColor: string;
  };
}

export type AuthContextType = {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

export interface TranscriptEntry {
  speaker: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export interface CallLog {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  callSid: string;
  streamSid: string;
  from: string;
  to: string;
  startTime: Date;
  endTime?: Date;
  status: 'in-progress' | 'completed' | 'failed';
  duration?: number;
  transcript: TranscriptEntry[];
}
