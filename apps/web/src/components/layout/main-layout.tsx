'use client';

import { Award,Bell,BookOpen,Brain,GraduationCap,Home,Settings,Trophy } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GlobalSearch } from './global-search';
import { NotificationsBell } from './notifications-bell';
import { ThemeToggle } from './theme-toggle';

const studentNav = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Kursus', href: '/courses', icon: BookOpen },
  { title: 'Sertifikat', href: '/certificates', icon: Award },
  { title: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { title: 'AI Assistant', href: '/ai', icon: Brain },
  { title: 'Notifikasi', href: '/notifications', icon: Bell },
  { title: 'Pengaturan', href: '/settings', icon: Settings },
];

export function MainLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r bg-card lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Brain className="h-6 w-6 text-primary" />
          <Link href="/dashboard" className="text-lg font-bold">
            AI-LMS
          </Link>
        </div>
        <nav className="space-y-1 p-4">
          {studentNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? 'secondary' : 'ghost'}
                  className={cn('w-full justify-start gap-3', active && 'font-medium')}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 sm:px-6">
          <GlobalSearch />
          <div className="flex-1" />
          <ThemeToggle />
          <NotificationsBell />
          <Link href="/profile">
            <Button variant="ghost" size="sm">
              <GraduationCap className="h-5 w-5 mr-2" />
              Profile
            </Button>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
