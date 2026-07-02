'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, Filter, BookOpen, Clock, Star } from 'lucide-react';
import Link from 'next/link';

import { api } from '@/lib/api-client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', { search, category, difficulty, page }],
    queryFn: () => {
      const params: any = { page, limit: 12 };
      if (search) params.search = search;
      if (category !== 'all') params.category = category;
      if (difficulty !== 'all') params.difficulty = difficulty;
      return api.get<any>('/courses', { params });
    },
  });

  const courses = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Katalog Kursus</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari kursus..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            <SelectItem value="programming">Programming</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>

        <Select value={difficulty} onValueChange={setDifficulty}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Semua Tingkat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tingkat</SelectItem>
            <SelectItem value="beginner">Pemula</SelectItem>
            <SelectItem value="intermediate">Menengah</SelectItem>
            <SelectItem value="advanced">Lanjutan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-t-lg" />
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course: any) => (
              <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow overflow-hidden group">
                <div className="relative h-40 bg-muted overflow-hidden">
                  {course.thumbnailUrl ? (
                    <img 
                      src={course.thumbnailUrl} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary">
                      <BookOpen className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 text-xs font-semibold rounded shadow-sm">
                    {course.difficulty === 'beginner' ? 'Pemula' : 
                     course.difficulty === 'intermediate' ? 'Menengah' : 'Lanjutan'}
                  </div>
                </div>
                
                <CardHeader className="flex-none p-4 pb-2">
                  <CardTitle className="text-lg line-clamp-2 leading-tight">
                    <Link href={`/courses/${course.slug}`} className="hover:text-primary transition-colors">
                      {course.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 p-4 pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {course.shortDescription}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{course.estimatedDuration}j</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      <span>{course.totalModules} Modul</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{course.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="p-4 pt-0">
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/courses/${course.slug}`}>
                      Lihat Detail
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button 
                variant="outline" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <div className="flex items-center px-4 text-sm font-medium">
                Halaman {page} dari {meta.totalPages}
              </div>
              <Button 
                variant="outline" 
                disabled={page === meta.totalPages}
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
              >
                Selanjutnya
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-medium">Tidak ada kursus ditemukan</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Coba ubah filter pencarian Anda untuk menemukan hasil yang sesuai.
          </p>
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => {
              setSearch('');
              setCategory('all');
              setDifficulty('all');
            }}
          >
            Reset Filter
          </Button>
        </div>
      )}
    </div>
  );
}
