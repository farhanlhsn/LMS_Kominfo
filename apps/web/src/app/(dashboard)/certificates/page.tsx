'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Calendar, Download, Eye, ExternalLink, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api-client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Certificate {
  id: string;
  certificateNumber: string;
  pdfUrl: string | null;
  issuedAt: string;
  course: {
    title: string;
    thumbnailUrl: string | null;
  };
}

export default function CertificatesPage(): React.ReactElement {
  const { data: certificates, isLoading, error } = useQuery<Certificate[]>({
    queryKey: ['my-certificates'],
    queryFn: () => api.get('/certificates/me'),
  });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sertifikat Saya</h1>
            <p className="text-sm text-muted-foreground">Unduh atau verifikasi sertifikat penyelesaian kursus Anda.</p>
          </div>
        </div>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800 text-sm">Gagal memuat sertifikat</h3>
              <p className="text-xs text-red-700 mt-1">Terjadi kesalahan pada server saat mengambil data sertifikat Anda.</p>
            </div>
          </CardContent>
        </Card>
      ) : certificates && certificates.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <Card key={cert.id} className="shadow-md overflow-hidden flex flex-col h-full hover:border-primary/45 transition-colors border">
              {/* Fake doc styling */}
              <div className="h-40 bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center text-white p-6 relative">
                <div className="absolute inset-2 border border-white/20 rounded" />
                <Award className="h-16 w-16 text-yellow-400 opacity-90 drop-shadow" />
              </div>
              <CardHeader className="flex-1">
                <CardTitle className="text-base font-bold line-clamp-2">{cert.course.title}</CardTitle>
                <CardDescription className="text-xs font-semibold mt-1">No. {cert.certificateNumber}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Diterbitkan: {new Date(cert.issuedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}</span>
                </div>
              </CardContent>
              <CardFooter className="border-t p-3 bg-muted/10 flex gap-2">
                {cert.pdfUrl && (
                  <a href={cert.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" />
                      Lihat PDF
                    </Button>
                  </a>
                )}
                <a
                  href={`/certificates/verify/${cert.certificateNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button size="sm" className="w-full gap-1.5 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Verifikasi
                  </Button>
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-sm py-16 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2">
          <div className="p-4 rounded-full bg-muted text-muted-foreground">
            <Award className="h-12 w-12" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Belum Ada Sertifikat</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Selesaikan salah satu kursus yang terdaftar dengan persentase progress 100% untuk mendapatkan sertifikat kelulusan.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
