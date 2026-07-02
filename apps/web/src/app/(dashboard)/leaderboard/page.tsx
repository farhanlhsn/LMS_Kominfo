'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Crown, Star, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LeaderboardEntry {
  id: string;
  totalXP: number;
  totalScore: number;
  rank: number;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export default function LeaderboardPage(): React.ReactElement {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'regional' | 'global'>('regional');

  // Fetch Regional Leaderboard
  const { data: regionalData, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard-regional'],
    queryFn: () => api.get('/gamification/leaderboard/region'),
  });

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-6 w-6 text-yellow-500 animate-bounce" />;
      case 1:
        return <Medal className="h-6 w-6 text-slate-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Papan Skor</h1>
          <p className="text-sm text-muted-foreground">Lihat peringkat Anda dan bersainglah dengan rekan belajar Anda.</p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-muted">
        <button
          onClick={() => setActiveTab('regional')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'regional'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Klasemen Regional
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'global'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Klasemen Nasional
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'regional' ? (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Peringkat Wilayah Anda</CardTitle>
            <CardDescription>
              Menampilkan peringkat 10 besar peserta dengan perolehan XP tertinggi di wilayah Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground">
                    <th className="px-6 py-3 text-left font-semibold">Peringkat</th>
                    <th className="px-6 py-3 text-left font-semibold">Peserta</th>
                    <th className="px-6 py-3 text-right font-semibold">Total XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {regionalData && regionalData.length > 0 ? (
                    regionalData.map((entry, index) => {
                      const isCurrentUser = entry.user.id === user?.id;

                      return (
                        <tr
                          key={entry.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            isCurrentUser ? 'bg-primary/5 font-semibold' : ''
                          }`}
                        >
                          <td className="px-6 py-4 flex items-center gap-2">
                            {getRankBadge(index)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 border text-primary flex items-center justify-center font-bold uppercase text-xs shrink-0">
                                {entry.user.name.substring(0, 2)}
                              </div>
                              <div>
                                <span className="text-foreground block">{entry.user.name}</span>
                                {isCurrentUser && (
                                  <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                                    Anda
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-bold text-foreground flex items-center justify-end gap-1.5">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              {entry.totalXP.toLocaleString()} XP
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic">
                        Belum ada data klasemen regional.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Peringkat Nasional</CardTitle>
            <CardDescription>
              Menampilkan peringkat akumulatif dari seluruh wilayah di Indonesia.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-600">
              <Star className="h-10 w-10 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Papan Skor Nasional Segera Hadir</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Fitur ini sedang dalam pengembangan untuk mendukung data sinkronisasi antar region.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
