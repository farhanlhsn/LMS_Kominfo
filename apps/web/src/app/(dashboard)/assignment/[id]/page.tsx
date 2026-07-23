'use client';

import { api } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { AlertTriangle,Calendar,CheckCircle2,FileText,Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React,{ use,useRef,useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card,CardContent,CardDescription,CardFooter,CardHeader,CardTitle } from '@/components/ui/card';

interface Material {
  id: string;
  originalFilename: string;
  publicUrl: string;
  mimeType: string;
}

interface AssignmentDetails {
  id: string;
  title: string;
  instruction: string;
  dueDate: string | null;
  maxScore: number;
  allowedExtensions: string[];
}

interface Submission {
  id: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  material: Material;
}

export default function AssignmentPage(props: { params: Promise<{ id: string }> }): React.ReactElement {
  const queryClient = useQueryClient();
  const router = useRouter();
  const assignmentId = use(props.params).id;

  // States
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch assignment details
  const { data: assignment, isLoading: isLoadingAssignment, error: assignmentError } = useQuery<AssignmentDetails>({
    queryKey: ['assignment', assignmentId],
    queryFn: () => api.get(`/assignments/${assignmentId}`),
  });

  // 2. Fetch student's submission
  const { data: submission, isLoading: isLoadingSubmission } = useQuery<Submission | null>({
    queryKey: ['my-submission', assignmentId],
    queryFn: () => api.get<Submission>(`/assignments/${assignmentId}/my-submission`).catch(() => null), // If not submitted yet, might return null or 404
  });

  // 3. Submit assignment mutation
  const submitMutation = useMutation({
    mutationFn: (payload: { materialId: string }) =>
      api.post(`/assignments/${assignmentId}/submit`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submission', assignmentId] });
      setFile(null);
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Gagal mengirimkan tugas.');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file extension
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (assignment && assignment.allowedExtensions.length > 0 && ext) {
      if (!assignment.allowedExtensions.includes(ext)) {
        setError(`Format berkas tidak diizinkan. Gunakan format: ${assignment.allowedExtensions.join(', ')}`);
        return;
      }
    }

    setFile(selectedFile);
  };

  const handleUploadAndSubmit = async () => {
    if (!file) return;
    setError(null);
    setIsUploading(true);

    try {
      // 1. Create Form Data and upload file
      const formData = new FormData();
      formData.append('file', file);

      // Access Token for manual multipart fetch
      const token = localStorage.getItem('access_token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

      const uploadRes = await fetch(`${baseUrl}/materials/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Gagal mengunggah berkas.');
      }

      const material = await uploadRes.json();

      // 2. Submit to assignment
      submitMutation.mutate({ materialId: material.id });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat mengunggah berkas.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingAssignment || isLoadingSubmission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (assignmentError || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <CardTitle>Error</CardTitle>
            <CardDescription>Gagal memuat tugas.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.back()}>Kembali</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isGraded = submission?.gradedAt !== null && submission?.score !== null;
  const isPastDue = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <FileText className="h-6 w-6" />
          <span>Penugasan Mandiri</span>
        </div>

        {/* Instructions Card */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold">{assignment.title}</CardTitle>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
              {assignment.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Batas Pengumpulan: {new Date(assignment.dueDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Nilai Maksimal: {assignment.maxScore} Poin</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none text-foreground border-t pt-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{assignment.instruction}</p>
          </CardContent>
        </Card>

        {/* Upload or Submission status card */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Status Pengumpulan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission ? (
              <div className="space-y-4">
                {/* File Details */}
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground block">Berkas Dikumpulkan</span>
                    <a
                      href={submission.material.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary hover:underline truncate block"
                    >
                      {submission.material.originalFilename}
                    </a>
                  </div>
                </div>

                {/* Score & Feedback */}
                {isGraded ? (
                  <div className="p-4 border border-green-200 rounded-lg bg-green-50/50 space-y-2">
                    <span className="text-xs text-green-700 font-bold uppercase tracking-wider block">Nilai Tugas</span>
                    <div className="flex items-baseline gap-1 text-green-700">
                      <span className="text-4xl font-black">{submission.score}</span>
                      <span className="text-sm text-green-600/70">/ {assignment.maxScore} Poin</span>
                    </div>
                    {submission.feedback && (
                      <div className="pt-2 border-t border-green-200/50 mt-2 text-xs text-green-800">
                        <span className="font-bold block">Feedback Instruktur:</span>
                        <p className="mt-1 leading-relaxed">{submission.feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                    <span>
                      Tugas telah berhasil dikumpulkan pada{' '}
                      {new Date(submission.submittedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      . Menunggu penilaian instruktur.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 border-2 border-dashed rounded-lg bg-muted/10 space-y-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-bold text-sm">Unggah Jawaban Tugas</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format yang diizinkan: {assignment.allowedExtensions.join(', ').toUpperCase()}
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept={assignment.allowedExtensions.map((x) => `.${x}`).join(',')}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Pilih Berkas
                </Button>
                {file && (
                  <div className="text-xs text-foreground font-semibold">
                    Berkas terpilih: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4 bg-muted/10">
            <Button variant="ghost" onClick={() => router.back()}>
              Kembali
            </Button>
            {!submission && (
              <Button
                onClick={handleUploadAndSubmit}
                disabled={!file || isUploading || submitMutation.isPending || isPastDue}
                className="gap-2"
              >
                {isUploading || submitMutation.isPending ? 'Mengirimkan...' : 'Kumpulkan Tugas'}
              </Button>
            )}
            {submission && !isGraded && !isPastDue && (
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm('Tugas Anda sudah dikumpulkan. Ingin mengganti dengan berkas baru?')) {
                    queryClient.setQueryData(['my-submission', assignmentId], null);
                  }
                }}
              >
                Kirim Ulang
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
