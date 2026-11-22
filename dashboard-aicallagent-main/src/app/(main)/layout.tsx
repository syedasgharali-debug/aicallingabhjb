'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { MainSidebar } from '@/components/main-sidebar';
import { LoaderCircle } from 'lucide-react';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // or a redirect component
  }

  return (
    <div className="flex min-h-screen">
      <MainSidebar />
      <main className="flex-1 pl-64">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
