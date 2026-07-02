'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { BarChart3, Users, Map, BookOpen, Brain, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const adminNav = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
  { title: 'Manajemen User', href: '/admin/users', icon: Users },
  { title: 'Manajemen Wilayah', href: '/admin/regions', icon: Map },
  { title: 'Manajemen Kursus', href: '/admin/courses', icon: BookOpen },
];

export default function AdminLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Role Protection
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'REGIONAL_ADMIN';
  if (!user || !isAdmin) {
    router.replace('/dashboard');
    return <div />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Admin Sidebar */}
      <aside className="hidden w-64 border-r bg-card lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-6 bg-slate-900 text-white">
          <Brain className="h-6 w-6 text-yellow-400" />
          <Link href="/admin/dashboard" className="text-lg font-bold">
            Portal Admin
          </Link>
        </div>
        <div className="flex flex-col h-[calc(100vh-4rem)] justify-between p-4 bg-slate-900 text-slate-300">
          <nav className="space-y-1">
            {adminNav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-3 hover:bg-slate-800 hover:text-white',
                      active ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="space-y-4">
            <div className="border-t border-slate-800 pt-4 px-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Nama Admin</span>
              <span className="text-xs font-semibold text-slate-300 truncate block mt-0.5">{user.name}</span>
              <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded w-max mt-1.5 flex items-center gap-1 font-bold">
                <Shield className="h-2.5 w-2.5" />
                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin Regional'}
              </span>
            </div>
            <Button
              onClick={logout}
              variant="ghost"
              className="w-full justify-start gap-3 text-red-400 hover:bg-red-950/20 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-16 items-center border-b bg-card px-6">
          <div className="flex-1" />
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="text-xs">
              Masuk Portal Siswa
            </Button>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 bg-muted/20 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
