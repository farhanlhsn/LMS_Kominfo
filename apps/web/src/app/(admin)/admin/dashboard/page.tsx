'use client';

import { api } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3,BookOpen,GraduationCap,Percent,Users } from 'lucide-react';
import React from 'react';

import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';

interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  completionRate: number;
}

export default function AdminDashboardPage(): React.ReactElement {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/analytics/admin'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Admin</h1>
          <p className="text-sm text-muted-foreground">Analitik performa platform pembelajaran digital.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            icon={Users}
            label="Total Pengguna"
            value={stats?.totalUsers ?? 0}
            description="Total semua akun terdaftar"
            color="text-blue-500"
          />
          <DashboardStatCard
            icon={BookOpen}
            label="Total Kursus"
            value={stats?.totalCourses ?? 0}
            description="Kursus aktif saat ini"
            color="text-purple-500"
          />
          <DashboardStatCard
            icon={GraduationCap}
            label="Total Pendaftaran"
            value={stats?.totalEnrollments ?? 0}
            description="Siswa yang mengikuti kelas"
            color="text-orange-500"
          />
          <DashboardStatCard
            icon={Percent}
            label="Rasio Kelulusan"
            value={`${stats?.completionRate ?? 0}%`}
            description="Persentase lulus evaluasi"
            color="text-green-500"
          />
        </div>
      )}
    </div>
  );
}

function DashboardStatCard({
  icon: Icon,
  label,
  value,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  description: string;
  color: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`p-2 rounded-lg bg-muted/40 shrink-0 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-extrabold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
