'use client';

import React, { useState, useEffect } from 'react';
import { Settings, User, Shield, Moon, AlertCircle, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api-client';

interface MeProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  organization?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  role: string;
  region?: { name: string } | null;
}

export default function SettingsPage(): React.ReactElement {
  const { user: authUser, refreshUser } = useAuth();
  const qc = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'security' | 'appearance'>('profile');

  const [name, setName] = useState(authUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [organization, setOrganization] = useState('');
  const [bio, setBio] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Prefill from current user
  useEffect(() => {
    if (authUser) {
      setName(authUser.name || '');
    }
  }, [authUser]);

  const profileMutation = useMutation({
    mutationFn: (data: { name?: string; phoneNumber?: string; organization?: string; bio?: string }) =>
      api.patch<MeProfile>('/users/me', data),
    onSuccess: async (updated) => {
      toast.success('Profil berhasil diperbarui');
      if (updated.phoneNumber) setPhoneNumber(updated.phoneNumber);
      if (updated.organization) setOrganization(updated.organization);
      if (updated.bio) setBio(updated.bio);
      await qc.invalidateQueries({ queryKey: ['me'] });
      await refreshUser?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal memperbarui profil');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post<{ success: boolean }>('/users/me/change-password', data),
    onSuccess: () => {
      toast.success('Password berhasil diubah');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mengubah password');
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama tidak boleh kosong');
      return;
    }
    profileMutation.mutate({ name, phoneNumber, organization, bio });
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Password baru dan konfirmasi tidak cocok');
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola informasi akun, keamanan sandi, dan preferensi tampilan Anda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <Card className="md:col-span-1 shadow-sm border-muted">
          <CardContent className="p-2 space-y-1">
            <button
              onClick={() => setActiveSubTab('profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                activeSubTab === 'profile' ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <User className="h-4 w-4" /> Profil Akun
            </button>
            <button
              onClick={() => setActiveSubTab('security')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                activeSubTab === 'security' ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <Shield className="h-4 w-4" /> Keamanan
            </button>
            <button
              onClick={() => setActiveSubTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                activeSubTab === 'appearance' ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <Moon className="h-4 w-4" /> Tampilan
            </button>
          </CardContent>
        </Card>

        <div className="md:col-span-3">
          {activeSubTab === 'profile' && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Informasi Profil</CardTitle>
                <CardDescription>Perbarui nama, nomor telepon, organisasi, dan bio Anda.</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (tidak dapat diubah)</Label>
                    <Input id="email" type="email" value={authUser?.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <Input
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+62 8xx..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org">Organisasi / Instansi</Label>
                    <Input
                      id="org"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Contoh: Diskominfo Aceh"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Ceritakan sedikit tentang diri Anda..."
                    />
                  </div>
                </CardContent>
                <div className="p-6 pt-0 flex justify-end">
                  <Button type="submit" disabled={profileMutation.isPending}>
                    {profileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Simpan Perubahan
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeSubTab === 'security' && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Keamanan & Password</CardTitle>
                <CardDescription>Ubah password secara berkala untuk menjaga akun Anda tetap aman.</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdatePassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current">Password Saat Ini</Label>
                    <Input
                      id="current"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new">Password Baru (min. 8 karakter)</Label>
                    <Input
                      id="new"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Konfirmasi Password Baru</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md text-sm text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>Setelah mengubah password, Anda akan logout otomatis dari semua sesi.</p>
                  </div>
                </CardContent>
                <div className="p-6 pt-0 flex justify-end">
                  <Button type="submit" disabled={passwordMutation.isPending}>
                    {passwordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Ubah Password
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeSubTab === 'appearance' && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Tampilan</CardTitle>
                <CardDescription>Pilih tema terang, gelap, atau mengikuti preferensi sistem.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Klik ikon di header (kanan atas) untuk mengganti tema. Pilihan Anda akan tersimpan di browser ini.
                </p>
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  <span className="text-sm">Toggle tema (Light → Dark → System)</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
