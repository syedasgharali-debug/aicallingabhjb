'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  LayoutDashboard,
  KeyRound,
  Users,
  ScrollText,
  LogOut,
  LoaderCircle,
  Palette,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from './ui/separator';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/keys', label: 'API Keys', icon: KeyRound },
  { href: '/agents', label: 'Agents', icon: Users },
  { href: '/logs', label: 'Call Logs', icon: ScrollText },
  { href: '/appearance', label: 'Appearance', icon: Palette },
];

export function MainSidebar() {
  const pathname = usePathname();
  const { userData, signOut, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-10 flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Bot className="h-6 w-6 text-primary" />
          <span>Agent Central</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-2 px-4 py-4">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              className="w-full justify-start"
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t p-4">
        <div className="flex items-center justify-between">
           {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : 
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userData?.photoURL || ''} alt={userData?.displayName || 'User'} />
                <AvatarFallback>
                  {userData?.displayName
                    ? userData.displayName.charAt(0).toUpperCase()
                    : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{userData?.displayName || 'User'}</span>
            </div>
           }
          <div className="flex items-center">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
