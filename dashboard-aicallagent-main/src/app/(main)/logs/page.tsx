
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { LoaderCircle, MessageSquareText } from 'lucide-react';
import { format } from 'date-fns';
import type { CallLog, TranscriptEntry } from '@/types';

export default function CallLogsPage() {
  const { user } = useAuth();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const fetchCallLogs = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const logsRef = collection(db, 'callLogs');
        const q = query(logsRef, where('userId', '==', user.uid), orderBy('startTime', 'desc'));
        const querySnapshot = await getDocs(q);
        const logs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime.toDate(),
          endTime: doc.data().endTime?.toDate(),
        })) as CallLog[];
        setCallLogs(logs);
      } catch (error) {
        console.error("Error fetching call logs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCallLogs();
  }, [user]);

  const handleViewLog = (log: CallLog) => {
    setSelectedLog(log);
    setIsSheetOpen(true);
  };
  
  const formatDuration = (milliseconds: number | undefined) => {
    if (milliseconds === undefined) return 'N/A';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
      <h1 className="text-3xl font-bold">Call Logs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>Review the history of all inbound and outbound calls.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <LoaderCircle className="h-8 w-8 animate-spin" />
            </div>
          ) : callLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(log.startTime, 'PPp')}</TableCell>
                    <TableCell>{log.agentName || 'Unknown'}</TableCell>
                    <TableCell>{log.from}</TableCell>
                    <TableCell>{log.to}</TableCell>
                    <TableCell>{formatDuration(log.duration)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewLog(log)}>
                        View Log
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center gap-4 text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                <MessageSquareText className="h-12 w-12" />
                <h2 className="text-xl font-semibold">No Calls Yet</h2>
                <p>
                    As soon as you make or receive calls, they will appear here.
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-lg w-full">
          <SheetHeader>
            <SheetTitle>Call Transcript</SheetTitle>
            <SheetDescription>
              {selectedLog ? `Call from ${selectedLog.from} to ${selectedLog.to} on ${format(selectedLog.startTime, 'PPp')}` : ''}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-4 h-full overflow-y-auto pr-4">
            {selectedLog?.transcript?.length ? selectedLog.transcript.map((entry: TranscriptEntry, index) => (
              <div key={index} className={`flex flex-col ${entry.speaker === 'agent' ? 'items-start' : 'items-end'}`}>
                 <div className={`rounded-lg px-4 py-2 max-w-sm ${entry.speaker === 'agent' ? 'bg-secondary' : 'bg-primary text-primary-foreground'}`}>
                   <p className="text-sm">{entry.text}</p>
                 </div>
                 <p className="text-xs text-muted-foreground mt-1 px-1">
                   {entry.speaker.charAt(0).toUpperCase() + entry.speaker.slice(1)} - {format(new Date(entry.timestamp), 'h:mm:ss a')}
                 </p>
              </div>
            )) : <p className="text-muted-foreground text-center pt-10">No transcript available for this call.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

