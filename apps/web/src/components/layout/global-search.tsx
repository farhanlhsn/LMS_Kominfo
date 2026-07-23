'use client';

import { api } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { BookOpen,GraduationCap,Loader2,Search,X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React,{ useEffect,useRef,useState } from 'react';

interface SearchResults {
  courses: { id: string; title: string; slug: string; type: 'course' }[];
  lessons: { id: string; title: string; courseTitle: string; courseSlug: string; type: 'lesson' }[];
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const el = document.getElementById('global-search-input') as HTMLInputElement | null;
        el?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    router.push(`/courses?q=${encodeURIComponent(query)}`);
    setOpen(false);
  };

  const hasResults = (data?.courses?.length || 0) + (data?.lessons?.length || 0) > 0;

  return (
    <div ref={ref} className="relative flex-1 max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="global-search-input"
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Cari kursus, pelajaran... (Ctrl+K)"
            className="w-full h-9 pl-9 pr-9 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
          {query && !isFetching && (
            <button type="button" onClick={() => { setQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </form>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 rounded-md border bg-card shadow-lg z-50 max-h-96 overflow-y-auto">
          {!data ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Memulai pencarian...</div>
          ) : !hasResults ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Tidak ada hasil untuk &quot;{query}&quot;
            </div>
          ) : (
            <>
              {data.courses.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Kursus</p>
                  {data.courses.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { router.push(`/courses/${c.slug}`); setOpen(false); setQuery(''); }}
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded flex items-center gap-2"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                      <span className="flex-1 truncate">{c.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {data.lessons.length > 0 && (
                <div className="p-2 border-t">
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Pelajaran</p>
                  {data.lessons.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { router.push(`/learn/${l.id}`); setOpen(false); setQuery(''); }}
                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded flex items-center gap-2"
                    >
                      <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{l.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{l.courseTitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
