'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  ShieldAlert,
  Trash,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Plus,
  KeyRound,
} from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog, FormField } from '@/components/ui/confirm-dialog';

interface Region {
  id: string;
  name: string;
  slug: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  organization: string | null;
  region: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface UsersResponse {
  data: UserData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ROLES = [
  { value: 'STUDENT', label: 'Siswa' },
  { value: 'INSTRUCTOR', label: 'Instruktur' },
  { value: 'REGIONAL_ADMIN', label: 'Admin Regional' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

export default function AdminUsersPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserData | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    regionId: '',
    organization: '',
    bio: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Reset password modal
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);

  // Fetch regions for the form select
  const { data: regions } = useQuery<Region[]>({
    queryKey: ['admin-regions-list'],
    queryFn: () => api.get('/regions'),
  });

  // Fetch users
  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn: () =>
      api.get('/users', {
        params: {
          search: search || undefined,
          role: roleFilter || undefined,
          page,
          limit,
        },
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}`, { isActive: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Status pengguna diperbarui');
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Gagal memperbarui status';
      toast.error(msg);
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/users', body),
    onSuccess: () => {
      toast.success('Pengguna berhasil dibuat');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Gagal membuat pengguna';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<typeof form> }) =>
      api.patch(`/users/${id}`, body),
    onSuccess: () => {
      toast.success('Pengguna berhasil diperbarui');
      setFormOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Gagal memperbarui pengguna';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('Pengguna berhasil dihapus');
      setDeleteOpen(false);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Gagal menghapus pengguna';
      toast.error(msg);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post(`/users/${id}/reset-password`, { password }),
    onSuccess: () => {
      toast.success('Password berhasil direset');
      setResetOpen(false);
      setResetTarget(null);
      setNewPassword('');
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Gagal mereset password';
      toast.error(msg);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'STUDENT',
      regionId: regions?.[0]?.id ?? '',
      organization: '',
      bio: '',
    });
    setFormOpen(true);
  };

  const openEdit = (u: UserData) => {
    setEditing(u);
    setFormError(null);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      regionId: u.region?.id ?? '',
      organization: u.organization ?? '',
      bio: '',
    });
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name || !form.email || !form.regionId) {
      setFormError('Nama, email, dan wilayah wajib diisi');
      return;
    }
    if (!editing && (!form.password || form.password.length < 8)) {
      setFormError('Password minimal 8 karakter');
      return;
    }

    if (editing) {
      const body: Record<string, string> = {
        name: form.name,
        role: form.role,
        organization: form.organization,
      };
      if (form.regionId) body.regionId = form.regionId;
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate(form);
    }
  };

  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
            <p className="text-sm text-muted-foreground">Kelola semua akun terdaftar pada sistem LMS.</p>
          </div>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Pengguna
        </Button>
      </div>

      {/* Filters & Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select
              value={roleFilter || 'ALL'}
              onValueChange={(v) => {
                setRoleFilter(v === 'ALL' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40 text-xs h-10">
                <SelectValue placeholder="Semua Peran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Peran</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card className="shadow-md">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                    <th className="px-6 py-3 text-left">Nama</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Wilayah</th>
                    <th className="px-6 py-3 text-left">Peran</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data && data.data.length > 0 ? (
                    data.data.map((usr) => (
                      <tr key={usr.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{usr.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{usr.email}</td>
                        <td className="px-6 py-4 text-muted-foreground">{usr.region?.name || '-'}</td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded border ${
                              usr.role === 'SUPER_ADMIN'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : usr.role === 'REGIONAL_ADMIN'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : usr.role === 'INSTRUCTOR'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {usr.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleMutation.mutate({ id: usr.id, isActive: usr.isActive })}
                            disabled={toggleMutation.isPending}
                            className="inline-flex items-center gap-1.5"
                          >
                            {usr.isActive ? (
                              <>
                                <ToggleRight className="h-5 w-5 text-green-500" />
                                <span className="text-green-600 text-xs font-semibold">Aktif</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                                <span className="text-muted-foreground text-xs">Nonaktif</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(usr)}
                            className="h-8 w-8"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setResetTarget(usr);
                              setNewPassword('');
                              setResetOpen(true);
                            }}
                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            title="Reset password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteTarget(usr);
                              setDeleteOpen(true);
                            }}
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Hapus"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                        <div className="flex flex-col items-center gap-2">
                          <ShieldAlert className="h-8 w-8 text-muted-foreground/50" />
                          Pengguna tidak ditemukan.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {data && data.meta && (
              <Pagination
                page={data.meta.page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                limit={data.meta.limit}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Modal */}
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
            <DialogTitle>{editing ? 'Edit Pengguna' : 'Tambah Pengguna'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Perbarui informasi pengguna. Kosongkan password untuk tetap menggunakan yang lama.'
                : 'Buat akun baru. Password minimal 8 karakter.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nama" required htmlFor="name">
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama lengkap"
                  className="text-xs"
                  required
                />
              </FormField>
              <FormField label="Email" required htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@kominfo.go.id"
                  className="text-xs"
                  required
                  disabled={!!editing}
                />
              </FormField>
            </div>

            {!editing && (
              <FormField label="Password" required htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  className="text-xs"
                />
              </FormField>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Peran" required>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger className="text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Wilayah" required>
                <Select
                  value={form.regionId}
                  onValueChange={(v) => setForm({ ...form, regionId: v })}
                >
                  <SelectTrigger className="text-xs h-10">
                    <SelectValue placeholder="Pilih wilayah" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Organisasi" htmlFor="organization">
              <Input
                id="organization"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                placeholder="Instansi / unit kerja"
                className="text-xs"
              />
            </FormField>

            {!editing && (
              <FormField label="Bio" htmlFor="bio">
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Deskripsi singkat (opsional)"
                  className="text-xs min-h-[60px]"
                />
              </FormField>
            )}

            {formError && (
              <div className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {formError}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Pengguna'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password untuk <strong>{resetTarget?.name}</strong>. Password baru minimal 8 karakter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Password Baru" required>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="text-xs"
              />
            </FormField>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!resetTarget || newPassword.length < 8) return;
                resetPasswordMutation.mutate({ id: resetTarget.id, password: newPassword });
              }}
              disabled={resetPasswordMutation.isPending || newPassword.length < 8}
            >
              {resetPasswordMutation.isPending ? 'Mereset...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus Pengguna"
        description={
          deleteTarget ? (
            <>
              Apakah Anda yakin ingin menghapus pengguna <strong>{deleteTarget.name}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </>
          ) : null
        }
        confirmText="Hapus"
        cancelText="Batal"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}
