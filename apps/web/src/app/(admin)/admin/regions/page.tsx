'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Map, Paintbrush, ShieldAlert, Plus, Edit3, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api-client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog, FormField } from '@/components/ui/confirm-dialog';

interface Region {
  id: string;
  name: string;
  slug: string;
  themeColor: string;
  description: string | null;
  isActive: boolean;
  logoUrl?: string | null;
  bannerUrl?: string | null;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export default function AdminRegionsPage(): React.ReactElement {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    themeColor: '#1E40AF',
    description: '',
    logoUrl: '',
    bannerUrl: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Region | null>(null);

  const { data: regions, isLoading, error } = useQuery<Region[]>({
    queryKey: ['admin-regions'],
    queryFn: () => api.get('/regions'),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/regions', body),
    onSuccess: () => {
      toast.success('Wilayah berhasil dibuat');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-regions-list'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Gagal membuat wilayah';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<typeof form> }) =>
      api.patch(`/regions/${id}`, body),
    onSuccess: () => {
      toast.success('Wilayah diperbarui');
      setFormOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-regions-list'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Gagal memperbarui';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/regions/${id}`),
    onSuccess: () => {
      toast.success('Wilayah dinonaktifkan');
      setDeleteOpen(false);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-regions'] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Gagal'),
  });

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setForm({
      name: '',
      slug: '',
      themeColor: '#1E40AF',
      description: '',
      logoUrl: '',
      bannerUrl: '',
    });
    setFormOpen(true);
  };

  const openEdit = (r: Region) => {
    setEditing(r);
    setFormError(null);
    setForm({
      name: r.name,
      slug: r.slug,
      themeColor: r.themeColor,
      description: r.description ?? '',
      logoUrl: r.logoUrl ?? '',
      bannerUrl: r.bannerUrl ?? '',
    });
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name || !form.slug) {
      setFormError('Nama dan slug wajib diisi');
      return;
    }
    if (form.themeColor && !/^#[0-9A-Fa-f]{6}$/.test(form.themeColor)) {
      setFormError('Warna tema harus dalam format hex (#RRGGBB)');
      return;
    }
    const payload = {
      name: form.name,
      slug: slugify(form.slug),
      themeColor: form.themeColor,
      description: form.description || undefined,
      logoUrl: form.logoUrl || undefined,
      bannerUrl: form.bannerUrl || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Map className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Wilayah</h1>
            <p className="text-sm text-muted-foreground">Kelola warna branding daerah dan informasi wilayah penyelenggara.</p>
          </div>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Wilayah
        </Button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-6 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800 text-sm">Gagal memuat wilayah</h3>
              <p className="text-xs text-red-700 mt-1">Terjadi kesalahan saat memproses data wilayah.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {regions && regions.length > 0 ? (
            regions.map((region) => (
              <Card key={region.id} className="shadow-md border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg font-bold">{region.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-6 w-6 rounded-full border shadow-sm shrink-0"
                        style={{ backgroundColor: region.themeColor }}
                        title={`Warna Tema: ${region.themeColor}`}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(region)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setDeleteTarget(region);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">Slug: {region.slug}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {region.description || 'Tidak ada deskripsi wilayah.'}
                  </p>
                  <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                    <Paintbrush className="h-3.5 w-3.5" />
                    <span>
                      Kode Warna Branding:{' '}
                      <span className="font-bold text-foreground font-mono">{region.themeColor}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-2 text-center py-12 text-muted-foreground italic text-sm">
              Tidak ada data wilayah. Klik "Tambah Wilayah" untuk membuat baru.
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!submitting) {
            setFormOpen(o);
            if (!o) setEditing(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Wilayah' : 'Tambah Wilayah'}</DialogTitle>
            <DialogDescription>
              Atur branding dan deskripsi wilayah untuk kustomisasi tema LMS.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nama Wilayah" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
                  className="text-xs"
                  placeholder="cth: DKI Jakarta"
                />
              </FormField>
              <FormField label="Slug" required>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  className="text-xs font-mono"
                  placeholder="dki-jakarta"
                />
              </FormField>
            </div>

            <FormField label="Warna Tema" required description="Format hex: #RRGGBB">
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={form.themeColor}
                  onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={form.themeColor}
                  onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
                  className="text-xs font-mono flex-1"
                  placeholder="#1E40AF"
                />
              </div>
            </FormField>

            <FormField label="Deskripsi">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-xs min-h-[80px]"
                placeholder="Deskripsi singkat tentang wilayah ini..."
              />
            </FormField>

            <FormField label="Logo URL" description="URL gambar logo (opsional)">
              <Input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                className="text-xs"
                placeholder="https://..."
              />
            </FormField>

            <FormField label="Banner URL" description="URL gambar banner (opsional)">
              <Input
                value={form.bannerUrl}
                onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })}
                className="text-xs"
                placeholder="https://..."
              />
            </FormField>

            {formError && (
              <div className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {formError}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Wilayah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Nonaktifkan Wilayah"
        description={
          deleteTarget ? (
            <>
              Wilayah <strong>{deleteTarget.name}</strong> akan dinonaktifkan. Data historis tetap tersimpan.
            </>
          ) : null
        }
        confirmText="Nonaktifkan"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
