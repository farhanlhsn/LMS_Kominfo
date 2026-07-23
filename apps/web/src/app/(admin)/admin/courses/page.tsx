'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Search,
  Edit3,
  Trash,
  Plus,
  ChevronRight,
  ChevronDown,
  Loader2,
  FileText,
  Video,
  Link as LinkIcon,
  Layers,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api-client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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

interface Region { id: string; name: string; slug: string; }
interface Instructor { name: string; }

interface Course {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  totalLessons?: number;
  totalStudents?: number;
  instructor?: Instructor;
  region?: Region;
}

interface CoursesResponse {
  data: Course[];
  meta: { total: number; page: number; limit: number; totalPages: number; };
}

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  order: number;
  estimatedDuration: number | null;
  lessons?: CourseLesson[];
}

interface CourseLesson {
  id: string;
  title: string;
  order: number;
  type: string;
  duration: number;
  isPreview: boolean;
}

const DIFFICULTIES = [
  { value: 'beginner', label: 'Pemula' },
  { value: 'intermediate', label: 'Menengah' },
  { value: 'advanced', label: 'Lanjut' },
];

const LESSON_TYPES = [
  { value: 'TEXT', label: 'Teks / Markdown' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'PDF', label: 'PDF' },
  { value: 'LINK', label: 'Tautan Eksternal' },
];

const CATEGORIES = [
  'Digital Literacy',
  'Cybersecurity',
  'Data Analytics',
  'AI & Machine Learning',
  'Web Development',
  'Mobile Development',
  'Cloud Computing',
  'DevOps',
  'UI/UX Design',
  'Manajemen Pemerintahan',
  'Layanan Publik Digital',
  'Lainnya',
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export default function AdminCoursesPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    shortDescription: '',
    description: '',
    category: CATEGORIES[0] ?? '',
    difficulty: 'beginner',
    regionId: '',
    language: 'id',
    estimatedDuration: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Module editor
  const [modulesOpen, setModulesOpen] = useState(false);
  const [modulesCourse, setModulesCourse] = useState<Course | null>(null);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  const { data: regions } = useQuery<Region[]>({
    queryKey: ['admin-regions-list'],
    queryFn: () => api.get('/regions'),
  });

  const { data, isLoading } = useQuery<CoursesResponse>({
    queryKey: ['admin-courses', search, page],
    queryFn: () =>
      api.get('/courses', {
        params: { search: search || undefined, page, limit },
      }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/courses/${id}/publish`),
    onSuccess: () => {
      toast.success('Kursus dipublikasikan');
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Gagal'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/courses/${id}/archive`),
    onSuccess: () => {
      toast.success('Kursus diarsipkan');
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Gagal'),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form & { tags?: string[] }) => api.post('/courses', body),
    onSuccess: () => {
      toast.success('Kursus berhasil dibuat');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Gagal membuat kursus';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<typeof form> }) =>
      api.patch(`/courses/${id}`, body),
    onSuccess: () => {
      toast.success('Kursus diperbarui');
      setFormOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : 'Gagal memperbarui';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${id}`),
    onSuccess: () => {
      toast.success('Kursus diarsipkan');
      setDeleteOpen(false);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Gagal'),
  });

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setForm({
      title: '',
      slug: '',
      shortDescription: '',
      description: '',
      category: CATEGORIES[0] ?? '',
      difficulty: 'beginner',
      regionId: regions?.[0]?.id ?? '',
      language: 'id',
      estimatedDuration: 0,
    });
    setFormOpen(true);
  };

  const openEdit = async (c: Course) => {
    setFormError(null);
    try {
      const detail = await api.get<{
        id: string;
        title: string;
        slug: string;
        shortDescription: string;
        description: string;
        category: string;
        difficulty: string;
        regionId: string;
        language: string;
        estimatedDuration: number;
      }>(`/courses/${c.id}`);
      setEditing(c);
      setForm({
        title: detail.title,
        slug: detail.slug,
        shortDescription: detail.shortDescription,
        description: detail.description,
        category: detail.category,
        difficulty: detail.difficulty,
        regionId: detail.regionId,
        language: detail.language,
        estimatedDuration: detail.estimatedDuration,
      });
      setFormOpen(true);
    } catch (e: unknown) {
      toast.error(e instanceof ApiError ? e.message : 'Gagal memuat detail kursus');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title || !form.shortDescription || !form.description || !form.regionId) {
      setFormError('Judul, deskripsi singkat, deskripsi, dan wilayah wajib diisi');
      return;
    }

    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      estimatedDuration: Number(form.estimatedDuration) || 0,
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
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Kursus</h1>
            <p className="text-sm text-muted-foreground">Kelola draf, publikasi, dan struktur kursus di sistem.</p>
          </div>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Kursus
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari judul kursus..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs"
            />
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
                    <th className="px-6 py-3 text-left">Judul Kursus</th>
                    <th className="px-6 py-3 text-left">Kategori</th>
                    <th className="px-6 py-3 text-left">Wilayah</th>
                    <th className="px-6 py-3 text-left">Tingkat</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data && data.data.length > 0 ? (
                    data.data.map((course) => (
                      <tr key={course.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-foreground">
                          <div className="line-clamp-1">{course.title}</div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{course.category}</td>
                        <td className="px-6 py-4 text-muted-foreground">{course.region?.name ?? '-'}</td>
                        <td className="px-6 py-4 text-muted-foreground capitalize">{course.difficulty}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                              course.status === 'PUBLISHED'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : course.status === 'ARCHIVED'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}
                          >
                            {course.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Kelola Modul & Materi"
                            onClick={() => {
                              setModulesCourse(course);
                              setModulesOpen(true);
                            }}
                          >
                            <Layers className="h-4 w-4 text-purple-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit"
                            onClick={() => openEdit(course)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          {course.status === 'DRAFT' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => publishMutation.mutate(course.id)}
                              disabled={publishMutation.isPending}
                            >
                              Publish
                            </Button>
                          )}
                          {course.status === 'PUBLISHED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2 text-yellow-600 border-yellow-200"
                              onClick={() => archiveMutation.mutate(course.id)}
                              disabled={archiveMutation.isPending}
                            >
                              Arsip
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Hapus"
                            onClick={() => {
                              setDeleteTarget(course);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                        Kursus tidak ditemukan.
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Kursus' : 'Tambah Kursus'}</DialogTitle>
            <DialogDescription>
              Lengkapi informasi kursus. Slug akan dibuat otomatis dari judul bila kosong.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Judul" required>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })}
                  className="text-xs"
                  placeholder="cth: Pengenalan AI untuk Pelayanan Publik"
                />
              </FormField>
              <FormField label="Slug" description="otomatis jika kosong">
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  className="text-xs font-mono"
                  placeholder="pengenalan-ai-pelayanan-publik"
                />
              </FormField>
            </div>

            <FormField label="Deskripsi Singkat" required>
              <Input
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                className="text-xs"
                placeholder="Ringkasan satu kalimat"
                maxLength={500}
              />
            </FormField>

            <FormField label="Deskripsi Lengkap" required>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-xs min-h-[100px]"
                placeholder="Penjelasan mendalam tentang kursus..."
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Kategori" required>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? '' })}>
                  <SelectTrigger className="text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Tingkat Kesulitan" required>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger className="text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Wilayah" required>
                <Select value={form.regionId} onValueChange={(v) => setForm({ ...form, regionId: v })}>
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
              <FormField label="Bahasa">
                <Input
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="text-xs"
                  maxLength={5}
                />
              </FormField>
              <FormField label="Estimasi Durasi (menit)">
                <Input
                  type="number"
                  min={0}
                  value={form.estimatedDuration}
                  onChange={(e) => setForm({ ...form, estimatedDuration: Number(e.target.value) })}
                  className="text-xs"
                />
              </FormField>
            </div>

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
                {submitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Kursus'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Module Manager */}
      {modulesCourse && (
        <ModuleManager
          open={modulesOpen}
          onOpenChange={setModulesOpen}
          course={modulesCourse}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus Kursus"
        description={
          deleteTarget ? (
            <>
              Kursus <strong>{deleteTarget.title}</strong> akan diarsipkan dan tidak lagi tampil di daftar siswa.
            </>
          ) : null
        }
        confirmText="Hapus"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  );
}

// ============== Module Manager ==============
interface ModuleManagerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  course: Course;
}

function ModuleManager({ open, onOpenChange, course }: ModuleManagerProps): React.ReactElement {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newModuleOpen, setNewModuleOpen] = useState(false);
  const [newModule, setNewModule] = useState({ title: '', description: '' });
  const [newLesson, setNewLesson] = useState<{ moduleId: string | null }>({ moduleId: null });
  const [newLessonForm, setNewLessonForm] = useState({ title: '', type: 'TEXT', duration: 0, isPreview: false, markdown: '', videoUrl: '' });

  const { data: modules, isLoading } = useQuery<CourseModule[]>({
    queryKey: ['admin-modules', course.id],
    queryFn: () => api.get(`/courses/${course.id}/modules`),
    enabled: open,
  });

  // Fetch lessons when a module is expanded
  const lessonQueries = useQuery({
    queryKey: ['admin-module-lessons', expanded, course.id],
    queryFn: async () => {
      const result: Record<string, CourseLesson[]> = {};
      for (const m of modules ?? []) {
        if (expanded[m.id]) {
          result[m.id] = await api.get<CourseLesson[]>(`/modules/${m.id}/lessons`);
        }
      }
      return result;
    },
    enabled: open && Object.keys(expanded).some((k) => expanded[k]),
  });

  const createModuleMutation = useMutation({
    mutationFn: (dto: { title: string; description?: string }) =>
      api.post(`/courses/${course.id}/modules`, dto),
    onSuccess: () => {
      toast.success('Module ditambahkan');
      setNewModuleOpen(false);
      setNewModule({ title: '', description: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-modules', course.id] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Gagal'),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId: string) => api.delete(`/courses/${course.id}/modules/${moduleId}`),
    onSuccess: () => {
      toast.success('Module dihapus');
      queryClient.invalidateQueries({ queryKey: ['admin-modules', course.id] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Gagal'),
  });

  const createLessonMutation = useMutation({
    mutationFn: ({ moduleId, body }: { moduleId: string; body: typeof newLessonForm }) =>
      api.post(`/modules/${moduleId}/lessons`, body),
    onSuccess: () => {
      toast.success('Lesson ditambahkan');
      setNewLesson({ moduleId: null });
      setNewLessonForm({ title: '', type: 'TEXT', duration: 0, isPreview: false, markdown: '', videoUrl: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-module-lessons', expanded, course.id] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Gagal'),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      api.delete(`/modules/${moduleId}/lessons/${lessonId}`),
    onSuccess: () => {
      toast.success('Lesson dihapus');
      queryClient.invalidateQueries({ queryKey: ['admin-module-lessons', expanded, course.id] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Gagal'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-500" />
            Modul & Materi
          </DialogTitle>
          <DialogDescription>
            Kelola struktur kursus: <strong>{course.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : modules && modules.length > 0 ? (
            modules.map((m) => {
              const isExpanded = expanded[m.id];
              const lessons = lessonQueries.data?.[m.id] ?? [];
              return (
                <div key={m.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 p-3 bg-muted/20">
                    <button
                      onClick={() => setExpanded({ ...expanded, [m.id]: !isExpanded })}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{m.title}</div>
                      {m.description && <div className="text-xs text-muted-foreground">{m.description}</div>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Order: {m.order}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setNewLesson({ moduleId: m.id });
                        setExpanded({ ...expanded, [m.id]: true });
                      }}
                    >
                      <Plus className="h-3 w-3" /> Lesson
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm(`Hapus module "${m.title}"?`)) {
                          deleteModuleMutation.mutate(m.id);
                        }
                      }}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {isExpanded && (
                    <div className="p-3 space-y-2 bg-background">
                      {lessonQueries.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : lessons.length > 0 ? (
                        lessons.map((l) => (
                          <div
                            key={l.id}
                            className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted/20"
                          >
                            <LessonTypeIcon type={l.type} />
                            <div className="flex-1">
                              <div className="font-medium">{l.title}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {l.type} · {l.duration} menit
                                {l.isPreview && ' · Preview'}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:bg-red-50"
                              onClick={() => {
                                if (window.confirm(`Hapus lesson "${l.title}"?`)) {
                                  deleteLessonMutation.mutate({ moduleId: m.id, lessonId: l.id });
                                }
                              }}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground italic px-3 py-2 text-center">
                          Belum ada lesson di module ini.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground italic text-sm">
              Belum ada module. Tambahkan module pertama.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Selesai
          </Button>
          <Button onClick={() => setNewModuleOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Module Baru
          </Button>
        </DialogFooter>

        {/* New Module Dialog */}
        <Dialog open={newModuleOpen} onOpenChange={setNewModuleOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Module</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <FormField label="Judul Module" required>
                <Input
                  value={newModule.title}
                  onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                  className="text-xs"
                  placeholder="cth: Pengenalan AI"
                />
              </FormField>
              <FormField label="Deskripsi">
                <Textarea
                  value={newModule.description}
                  onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                  className="text-xs min-h-[60px]"
                />
              </FormField>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setNewModuleOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  if (!newModule.title) return;
                  createModuleMutation.mutate(newModule);
                }}
                disabled={createModuleMutation.isPending}
              >
                Tambah
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Lesson Dialog */}
        <Dialog open={newLesson.moduleId !== null} onOpenChange={(o) => !o && setNewLesson({ moduleId: null })}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Lesson</DialogTitle>
              <DialogDescription>Tambahkan materi pembelajaran baru ke dalam module.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <FormField label="Judul Lesson" required>
                <Input
                  value={newLessonForm.title}
                  onChange={(e) => setNewLessonForm({ ...newLessonForm, title: e.target.value })}
                  className="text-xs"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Tipe">
                  <Select
                    value={newLessonForm.type}
                    onValueChange={(v) => setNewLessonForm({ ...newLessonForm, type: v })}
                  >
                    <SelectTrigger className="text-xs h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LESSON_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Durasi (menit)">
                  <Input
                    type="number"
                    min={0}
                    value={newLessonForm.duration}
                    onChange={(e) => setNewLessonForm({ ...newLessonForm, duration: Number(e.target.value) })}
                    className="text-xs"
                  />
                </FormField>
              </div>
              {newLessonForm.type === 'TEXT' && (
                <FormField label="Konten Markdown">
                  <Textarea
                    value={newLessonForm.markdown}
                    onChange={(e) => setNewLessonForm({ ...newLessonForm, markdown: e.target.value })}
                    className="text-xs min-h-[120px] font-mono"
                    placeholder="# Materi Pengenalan&#10;&#10;Tulis konten dalam format markdown..."
                  />
                </FormField>
              )}
              {newLessonForm.type === 'VIDEO' && (
                <FormField label="URL Video (HLS/MP4)">
                  <Input
                    value={newLessonForm.videoUrl}
                    onChange={(e) => setNewLessonForm({ ...newLessonForm, videoUrl: e.target.value })}
                    className="text-xs"
                    placeholder="https://..."
                  />
                </FormField>
              )}
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={newLessonForm.isPreview}
                  onChange={(e) => setNewLessonForm({ ...newLessonForm, isPreview: e.target.checked })}
                  className="rounded"
                />
                <span>Bisa diakses tanpa enroll (preview gratis)</span>
              </label>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setNewLesson({ moduleId: null })}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  if (!newLesson.moduleId || !newLessonForm.title) return;
                  createLessonMutation.mutate({ moduleId: newLesson.moduleId, body: newLessonForm });
                }}
                disabled={createLessonMutation.isPending}
              >
                Tambah Lesson
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function LessonTypeIcon({ type }: { type: string }): React.ReactElement {
  switch (type) {
    case 'VIDEO':
      return <Video className="h-4 w-4 text-blue-500" />;
    case 'PDF':
      return <FileText className="h-4 w-4 text-red-500" />;
    case 'LINK':
      return <LinkIcon className="h-4 w-4 text-purple-500" />;
    case 'QUIZ':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'ASSIGNMENT':
      return <XCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
}
