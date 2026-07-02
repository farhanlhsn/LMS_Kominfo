'use client';

import React, { useState } from 'react';
import { Bell, CheckCheck, X, Filter, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  createdAt: string;
}

const typeColor: Record<Notification['type'], string> = {
  INFO: 'border-l-blue-400 bg-blue-50/30 dark:bg-blue-950/20',
  SUCCESS: 'border-l-green-400 bg-green-50/30 dark:bg-green-950/20',
  WARNING: 'border-l-yellow-400 bg-yellow-50/30 dark:bg-yellow-950/20',
  ERROR: 'border-l-red-400 bg-red-50/30 dark:bg-red-950/20',
};

const typeLabel: Record<Notification['type'], string> = {
  INFO: 'Info',
  SUCCESS: 'Sukses',
  WARNING: 'Peringatan',
  ERROR: 'Error',
};

const typeBadge: Record<Notification['type'], string> = {
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  WARNING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function NotificationsPage(): React.ReactElement {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list', filter],
    queryFn: () => api.get<Notification[]>(`/notifications?limit=100${filter === 'unread' ? '&unreadOnly=true' : ''}`),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Semua notifikasi ditandai sudah dibaca');
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter('all')}
            >
              <Filter className="h-3 w-3 mr-1" /> Semua
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter('unread')}
            >
              Belum dibaca ({unreadCount})
            </Button>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3 w-3 mr-1" /> Tandai semua
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Memuat notifikasi...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <h3 className="font-semibold text-sm">Tidak ada notifikasi</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {filter === 'unread' ? 'Semua notifikasi sudah dibaca.' : 'Anda akan melihat notifikasi di sini saat ada aktivitas.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'p-4 hover:bg-accent/30 transition-colors border-l-4',
                    typeColor[n.type],
                    !n.isRead && 'font-medium',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded uppercase', typeBadge[n.type])}>
                          {typeLabel[n.type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-sm font-semibold leading-snug">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => markRead.mutate(n.id)}
                        >
                          <CheckCheck className="h-3 w-3 mr-1" /> Tandai
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-red-500"
                        onClick={() => remove.mutate(n.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Hapus
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
