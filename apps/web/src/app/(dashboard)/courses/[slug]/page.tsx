'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { BookOpen, Clock, Star, PlayCircle, FileText, CheckCircle } from 'lucide-react';

import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => api.get<any>(`/courses/slug/${slug}`),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-muted rounded-xl w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-10 bg-muted w-3/4 rounded" />
            <div className="h-4 bg-muted w-full rounded" />
            <div className="h-4 bg-muted w-5/6 rounded" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Kursus tidak ditemukan</h2>
        <p className="text-muted-foreground mt-2">Kursus yang Anda cari mungkin sudah dihapus atau tidak tersedia.</p>
        <Button className="mt-6" onClick={() => router.push('/courses')}>Kembali ke Katalog</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Banner */}
      <div className="relative h-64 md:h-80 rounded-xl overflow-hidden bg-muted">
        {course.thumbnailUrl ? (
          <img 
            src={course.thumbnailUrl} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-primary/10 text-primary">
            <BookOpen className="h-20 w-20 opacity-20 mb-4" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end">
          <div className="p-6 md:p-10 w-full text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-primary px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider">
                {course.category}
              </span>
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold rounded-full">
                {course.difficulty === 'beginner' ? 'Pemula' : 
                 course.difficulty === 'intermediate' ? 'Menengah' : 'Lanjutan'}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-md">{course.title}</h1>
            <p className="text-lg text-gray-200 line-clamp-2 max-w-3xl drop-shadow">
              {course.shortDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Tentang Kursus Ini</h2>
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground">
              {course.description || course.shortDescription}
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-2xl font-bold mb-4">Instruktur</h2>
            <div className="flex items-center gap-4 p-4 border rounded-xl bg-card">
              <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex-shrink-0">
                {course.instructor?.avatarUrl ? (
                  <img src={course.instructor.avatarUrl} alt={course.instructor.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xl font-bold">
                    {course.instructor?.name?.charAt(0) || 'I'}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">{course.instructor?.name || 'Instruktur AI-LMS'}</h3>
                <p className="text-sm text-muted-foreground">{course.instructor?.email}</p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-2xl font-bold mb-4">Kurikulum</h2>
            {course.modules && course.modules.length > 0 ? (
              <div className="space-y-4">
                {course.modules.map((module: any) => (
                  <Card key={module.id}>
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">
                          Modul {module.order}: {module.title}
                        </CardTitle>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {module.lessons?.length ?? 0} Pelajaran
                        </span>
                      </div>
                      {module.description && (
                        <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                      )}
                    </CardHeader>
                    {module.lessons && module.lessons.length > 0 && (
                      <CardContent className="pt-0 pb-4 space-y-2">
                        {module.lessons.map((lesson: any) => {
                          const Icon =
                            lesson.type === 'VIDEO' ? PlayCircle :
                            lesson.type === 'PDF' ? FileText :
                            lesson.type === 'QUIZ' ? CheckCircle :
                            PlayCircle;
                          return (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-3 text-sm py-2"
                            >
                              <Icon className="h-4 w-4 text-primary" />
                              <span className="flex-1">
                                {lesson.order}. {lesson.title}
                              </span>
                              {lesson.duration > 0 && (
                                <span className="text-muted-foreground">{lesson.duration} mnt</span>
                              )}
                              {lesson.isPreview && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  Preview
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center border-dashed">
                <p className="text-sm text-muted-foreground">
                  Kurikulum untuk kursus ini belum tersedia.
                </p>
              </Card>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
              <CardDescription>Informasi singkat mengenai kursus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Durasi</span>
                </div>
                <span className="font-medium text-sm">{course.estimatedDuration} Jam</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm">Materi</span>
                </div>
                <span className="font-medium text-sm">{course.totalModules} Modul</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Rating</span>
                </div>
                <span className="font-medium text-sm">{course.rating?.toFixed(1) || 0} / 5.0</span>
              </div>
              
              <Separator />
              
              <Button size="lg" className="w-full font-bold shadow-md hover:shadow-lg transition-shadow">
                Daftar Kursus
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Mulai belajar sekarang untuk meningkatkan skill Anda.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
