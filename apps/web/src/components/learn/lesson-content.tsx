'use client';

import React from 'react';
import { FileText, ExternalLink, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './video-player';
import { Markdown } from './markdown';

interface LessonContentProps {
  lessonId: string;
  title: string;
  type: string;
  content: {
    markdown?: string | null;
    videoUrl?: string | null;
    videoPosition?: number | null;
    videoDuration?: number | null;
    youtubeUrl?: string | null;
    pdfUrl?: string | null;
    externalUrl?: string | null;
  } | null;
  onComplete: () => void;
  isCompleted: boolean;
  isCompleting: boolean;
}

export function LessonContent({
  lessonId,
  title,
  type,
  content,
  onComplete,
  isCompleted,
  isCompleting,
}: LessonContentProps) {
  // Helper to get embed YouTube URL
  const getYoutubeEmbedUrl = (url: string) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
      }
    } catch (e) {
      console.error('Invalid YouTube URL', e);
    }
    return url;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{title}</h1>
        <div className="mt-2 h-1 w-20 bg-primary rounded" />
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <div className="p-6">
          {/* === VIDEO: native (with HLS support via VideoPlayer) === */}
          {type === 'VIDEO' && content?.videoUrl ? (
            <div className="mb-6">
              <VideoPlayer
                lessonId={lessonId}
                videoUrl={content.videoUrl}
                initialPositionSec={content.videoPosition ?? 0}
                initialDurationSec={content.videoDuration ?? undefined}
                onComplete={onComplete}
              />
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Video className="h-3 w-3" />
                Posisi otomatis tersimpan dan Anda bisa melanjutkan nanti
              </p>
            </div>
          ) : null}

          {/* === VIDEO: YouTube embed (fallback) === */}
          {type === 'VIDEO' && !content?.videoUrl && content?.youtubeUrl ? (
            <div className="aspect-video w-full rounded bg-black overflow-hidden relative mb-6">
              <iframe
                src={getYoutubeEmbedUrl(content.youtubeUrl)}
                title={title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}

          {/* === PDF === */}
          {type === 'PDF' && content?.pdfUrl ? (
            <div className="border rounded-md p-6 flex flex-col items-center justify-center text-center bg-muted/30 space-y-4 mb-6">
              <FileText className="h-16 w-16 text-primary" />
              <div>
                <h3 className="font-bold text-lg">Dokumen PDF Terlampir</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Materi pembelajaran ini berformat PDF. Unduh atau buka berkas untuk membaca selengkapnya.
                </p>
              </div>
              <a href={content.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button>Buka Dokumen PDF</Button>
              </a>
            </div>
          ) : null}

          {/* === EXTERNAL LINK === */}
          {type === 'LINK' && content?.externalUrl ? (
            <div className="border rounded-md p-6 flex flex-col items-center justify-center text-center bg-muted/30 space-y-4 mb-6">
              <ExternalLink className="h-16 w-16 text-primary" />
              <div>
                <h3 className="font-bold text-lg">Pranala Luar</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Materi pembelajaran ini berada di situs eksternal. Klik tombol di bawah untuk membukanya.
                </p>
              </div>
              <a href={content.externalUrl} target="_blank" rel="noopener noreferrer">
                <Button>Buka Situs Eksternal</Button>
              </a>
            </div>
          ) : null}

          {/* === MARKDOWN (untuk semua tipe) === */}
          {content?.markdown ? (
            <div className="mt-4">
              <Markdown content={content.markdown} />
            </div>
          ) : type === 'TEXT' ? (
            <p className="text-muted-foreground italic">Konten materi teks kosong.</p>
          ) : null}
        </div>

        {/* Footer: complete button */}
        <div className="border-t bg-muted/20 px-6 py-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">
            {isCompleted ? '✅ Anda telah menyelesaikan materi ini' : '🔵 Materi belum diselesaikan'}
          </span>
          <Button
            onClick={onComplete}
            disabled={isCompleted || isCompleting}
            variant={isCompleted ? 'outline' : 'default'}
          >
            {isCompleting ? 'Memproses...' : isCompleted ? 'Selesai' : 'Tandai Selesai'}
          </Button>
        </div>
      </div>
    </div>
  );
}
