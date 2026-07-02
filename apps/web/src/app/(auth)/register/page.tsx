'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Brain } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api-client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Region {
  id: string;
  name: string;
  slug: string;
}

interface RegisterResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    regionId: string;
    avatarUrl?: string;
  };
}

export default function RegisterPage(): React.ReactElement {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regionId, setRegionId] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRegions, setIsLoadingRegions] = useState(true);

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const data = await api.get<Region[]>('/auth/regions');
        setRegions(data);
      } catch (err) {
        console.error('Failed to load regions:', err);
        setError('Gagal memuat daftar wilayah.');
      } finally {
        setIsLoadingRegions(false);
      }
    };
    fetchRegions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await api.post<RegisterResponse>('/auth/register', {
        name,
        email,
        password,
        regionId,
        role: 'STUDENT',
      });
      login(data.accessToken, data.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Brain className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold">Daftar</CardTitle>
          <CardDescription>Buat akun untuk mulai belajar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nama Anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Wilayah</Label>
              <select
                id="region"
                required
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                disabled={isLoading || isLoadingRegions}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{isLoadingRegions ? 'Memuat wilayah...' : 'Pilih wilayah'}</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isLoadingRegions}>
              {isLoading ? 'Mendaftarkan...' : 'Daftar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Masuk
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
