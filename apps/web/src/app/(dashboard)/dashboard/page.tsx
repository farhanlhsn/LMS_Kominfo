'use client';

import { BookOpen, Brain, Clock, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';

export default function DashboardPage(): React.ReactElement {
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['student-stats'],
    queryFn: () => api.get<any>('/analytics/student').catch(() => ({
      activeCourses: 0,
      learningHours: 0,
      xp: 0,
      aiChatUsage: 0,
    })),
  });

  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get<any>('/courses?limit=3').catch(() => ({ data: [] })),
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kursus Aktif</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isStatsLoading ? '...' : stats?.activeCourses || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jam Belajar</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isStatsLoading ? '...' : `${stats?.learningHours || 0}h`}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">XP</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isStatsLoading ? '...' : stats?.xp || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AI Chat</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isStatsLoading ? '...' : stats?.aiChatUsage || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Lanjutkan Belajar</CardTitle>
          </CardHeader>
          <CardContent>
            {isCoursesLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Memuat kursus...</p>
            ) : coursesData?.data?.length > 0 ? (
              <ul className="space-y-3">
                {coursesData.data.map((course: any) => (
                  <li key={course.id} className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-medium">{course.title}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Lanjutkan</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada kursus yang terdaftar. Jelajahi katalog kursus untuk memulai.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Rekomendasi AI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Rekomendasi pembelajaran akan muncul setelah Anda mulai belajar.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
