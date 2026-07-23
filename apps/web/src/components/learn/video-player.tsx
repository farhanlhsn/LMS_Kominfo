'use client';

import React, { useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  lessonId: string;
  videoUrl: string;
  initialPositionSec?: number;
  initialDurationSec?: number;
  onComplete?: () => void;
}

/**
 * Video player dengan resume-position tracking.
 *
 * Mendukung:
 *  - HTTP/HTTPS video biasa
 *  - HLS (.m3u8) di browser yang support (Safari native, Chrome via hls.js — load dinamis)
 *  - Auto-mark complete di ≥90% watched
 *  - Auto-save position tiap 10 detik
 *  - Resume dari posisi terakhir
 */
export function VideoPlayer({
  lessonId,
  videoUrl,
  initialPositionSec = 0,
  initialDurationSec,
  onComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);

  // Setup HLS jika video .m3u8
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!videoUrl.endsWith('.m3u8')) return;
    if (video.canPlayType('application/vnd.apple.mpegurl')) return; // Safari native
     
    let hls: any = null;
    let cancelled = false;
    (async () => {
      try {
         
        const mod = (await import(/* webpackIgnore: true */ 'hls.js' as any).catch(() => null)) as any;
        if (cancelled) return;
        if (!mod || !mod.default) {
          console.warn('hls.js tidak tersedia. Install dengan: pnpm add hls.js');
          return;
        }
        const Hls = mod.default;
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(videoUrl);
          hls.attachMedia(video);
        }
      } catch (err) {
        console.warn('HLS setup failed:', err);
      }
    })();
    return () => { cancelled = true; if (hls) hls.destroy(); };
  }, [videoUrl]);

  // Set initial position
  useEffect(() => {
    const video = videoRef.current;
    if (!video || initialPositionSec <= 0) return;
    const onMeta = () => {
      try { video.currentTime = Math.min(initialPositionSec, (video.duration || initialPositionSec) - 1); }
      catch { /* ignore */ }
    };
    video.addEventListener('loadedmetadata', onMeta, { once: true });
    return () => video.removeEventListener('loadedmetadata', onMeta);
  }, [initialPositionSec]);

  // Save position + auto-complete
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastTrack = 0;
    const onTime = async () => {
      const now = video.currentTime;
      // Track posisi tiap 10 detik
      if (Math.abs(now - lastTrack) >= 10) {
        lastTrack = now;
        lastSavedRef.current = now;
        try {
          await api.post(`/lessons/${lessonId}/track-video`, {
            positionSec: Math.floor(now),
            durationSec: Math.floor(video.duration || 0),
          });
        } catch { /* silent */ }
      }

      // Auto-complete di 90% watched
      if (!completedRef.current && video.duration > 0 && now / video.duration >= 0.9) {
        completedRef.current = true;
        onComplete?.();
      }
    };

    video.addEventListener('timeupdate', onTime);
    return () => video.removeEventListener('timeupdate', onTime);
  }, [lessonId, onComplete]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={videoUrl.endsWith('.m3u8') ? undefined : videoUrl}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full"
        onLoadStart={(e) => {
          if (initialDurationSec) (e.target as HTMLVideoElement).currentTime = initialPositionSec;
        }}
      >
        Browser Anda tidak mendukung video player.
      </video>
      {!videoUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuat video...
        </div>
      )}
    </div>
  );
}
