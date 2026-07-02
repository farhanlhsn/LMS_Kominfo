'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api-client';
import { BookOpen, Award, Star, Clock, Brain, Mail, MapPin } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StudentStats {
  activeCourses: number;
  completedCourses: number;
  learningHours: number;
  xp: number;
  aiChatUsage: number;
}

interface Badge {
  id: string;
  title: string;
  description: string;
  iconUrl: string | null;
  xpReward: number;
}

interface UserBadge {
  id: string;
  earnedAt: string;
  badge: Badge;
}

export default function ProfilePage(): React.ReactElement {
  const { user } = useAuth();

  // Fetch Student Stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<StudentStats>({
    queryKey: ['student-stats'],
    queryFn: () => api.get('/analytics/student'),
  });

  // Fetch Badges
  const { data: userBadges, isLoading: isLoadingBadges } = useQuery<UserBadge[]>({
    queryKey: ['student-badges'],
    queryFn: () => api.get('/gamification/badges/me'),
  });

  if (!user) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-muted-foreground">Silakan masuk untuk melihat profil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Profile Header */}
      <Card className="shadow-md bg-gradient-to-br from-card to-muted/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-primary/10 border text-primary flex items-center justify-center text-3xl font-black uppercase shrink-0">
              {user.name.substring(0, 2)}
            </div>
            <div className="text-center sm:text-left space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight">{user.name}</h1>
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span className="capitalize">{user.role}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics/Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Kursus Aktif"
          value={isLoadingStats ? '...' : stats?.activeCourses ?? 0}
          color="text-blue-500"
        />
        <StatCard
          icon={Award}
          label="Kursus Selesai"
          value={isLoadingStats ? '...' : stats?.completedCourses ?? 0}
          color="text-green-500"
        />
        <StatCard
          icon={Clock}
          label="Jam Belajar"
          value={isLoadingStats ? '...' : `${stats?.learningHours ?? 0}j`}
          color="text-orange-500"
        />
        <StatCard
          icon={Star}
          label="Total XP"
          value={isLoadingStats ? '...' : (stats?.xp ?? 0).toLocaleString()}
          color="text-yellow-500"
        />
      </div>

      {/* Achievements/Badges Section */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Lencana & Pencapaian
          </CardTitle>
          <CardDescription>Pencapaian khusus yang berhasil Anda raih selama masa belajar.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBadges ? (
            <div className="h-20 flex items-center justify-center">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : userBadges && userBadges.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {userBadges.map((ub) => (
                <div key={ub.id} className="flex gap-4 p-4 border rounded-lg bg-card hover:bg-muted/10 transition-colors">
                  <div className="h-12 w-12 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-500 flex items-center justify-center shrink-0">
                    <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{ub.badge.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{ub.badge.description}</p>
                    <span className="inline-block text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded border border-yellow-100 mt-2">
                      +{ub.badge.xpReward} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground italic text-sm">
              Belum ada lencana yang diraih. Selesaikan kuis atau tanyakan pertanyaan ke AI untuk meraih lencana pertama Anda!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2.5 rounded-lg bg-muted/40 shrink-0 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <span className="text-xs text-muted-foreground block">{label}</span>
          <span className="text-2xl font-bold mt-1 block">{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
