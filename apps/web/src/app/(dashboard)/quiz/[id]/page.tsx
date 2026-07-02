'use client';

import React, { use, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Brain, Clock, AlertTriangle, Play, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Choice {
  id: string;
  label: string;
  value: string;
}

interface Question {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'TRUE_FALSE' | 'ESSAY';
  question: string;
  choices: Choice[];
  score: number;
}

interface QuizDetails {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  durationMinutes: number;
  maxAttempt: number;
  questions: Question[];
}

interface StartAttemptResponse {
  attemptId: string;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  questions: Question[];
}

interface QuizAnswerInput {
  questionId: string;
  answer: string | string[];
}

export default function QuizPage(props: { params: Promise<{ id: string }> }): React.ReactElement {
  const router = useRouter();
  const quizId = use(props.params).id;

  // States
  const [isStarted, setIsStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // 1. Fetch quiz details for start screen
  const { data: quiz, isLoading, error } = useQuery<QuizDetails>({
    queryKey: ['quiz-details', quizId],
    queryFn: () => api.get(`/quizzes/${quizId}`),
  });

  // 2. Start attempt mutation
  const startMutation = useMutation({
    mutationFn: () => api.post<StartAttemptResponse>(`/quizzes/${quizId}/start`),
    onSuccess: (data) => {
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setIsStarted(true);
      if (data.durationMinutes > 0) {
        setTimeLeft(data.durationMinutes * 60);
      }
    },
  });

  // 3. Submit attempt mutation
  const submitMutation = useMutation({
    mutationFn: (payload: { answers: QuizAnswerInput[] }) =>
      api.post<{ score: number; passed: boolean }>(`/quizzes/${attemptId}/submit`, payload),
    onSuccess: () => {
      router.push(`/quiz/${attemptId}/result`);
    },
  });

  // Countdown timer logic
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || !isStarted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isStarted]);

  const handleStart = () => {
    startMutation.mutate();
  };

  const handleSelectAnswer = (questionId: string, optionLabel: string, isMulti: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId];
      if (isMulti) {
        const currentArr = Array.isArray(current) ? current : [];
        if (currentArr.includes(optionLabel)) {
          return { ...prev, [questionId]: currentArr.filter((x) => x !== optionLabel) };
        } else {
          return { ...prev, [questionId]: [...currentArr, optionLabel] };
        }
      } else {
        return { ...prev, [questionId]: optionLabel };
      }
    });
  };

  const handleAutoSubmit = () => {
    const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
      questionId: qId,
      answer: val,
    }));
    submitMutation.mutate({ answers: formattedAnswers });
  };

  const handleSubmit = () => {
    if (window.confirm('Apakah Anda yakin ingin menyelesaikan kuis ini?')) {
      handleAutoSubmit();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <CardTitle>Error</CardTitle>
            <CardDescription>Gagal memuat kuis. Pastikan tautan kuis valid.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.back()}>Kembali</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Pre-start screen
  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
        <Card className="w-full max-w-xl shadow-md border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2 text-primary font-semibold">
              <Brain className="h-6 w-6 text-primary" />
              <span>Kuis Interaktif</span>
            </div>
            <CardTitle className="text-3xl font-extrabold">{quiz.title}</CardTitle>
            <CardDescription className="text-sm mt-1">{quiz.description || 'Tidak ada deskripsi.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-md p-4 bg-background">
                <span className="text-xs text-muted-foreground block">Durasi Waktu</span>
                <span className="text-lg font-bold text-foreground mt-1 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  {quiz.durationMinutes > 0 ? `${quiz.durationMinutes} Menit` : 'Tanpa Batasan'}
                </span>
              </div>
              <div className="border rounded-md p-4 bg-background">
                <span className="text-xs text-muted-foreground block">Nilai Kelulusan</span>
                <span className="text-lg font-bold text-green-600 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {quiz.passingScore}%
                </span>
              </div>
            </div>
            <div className="p-3 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600 mt-0.5" />
              <span>
                Begitu kuis dimulai, penghitung waktu mundur akan langsung berjalan. Pastikan koneksi internet Anda stabil.
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4 bg-muted/10">
            <Button variant="ghost" onClick={() => router.back()}>
              Batal
            </Button>
            <Button onClick={handleStart} disabled={startMutation.isPending} className="gap-2">
              <Play className="h-4 w-4" />
              {startMutation.isPending ? 'Menyiapkan...' : 'Mulai Kuis'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Quiz-taking screen
  const currentQuestion = questions[currentIndex];
  const isMultiSelect = currentQuestion?.type === 'MULTIPLE_SELECT';

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-3xl flex justify-between items-center mb-6">
        <h1 className="text-lg font-bold truncate pr-4">{quiz.title}</h1>
        {timeLeft !== null && (
          <div className="flex items-center gap-2 bg-card px-4 py-2 border rounded-full shadow-sm text-sm font-bold text-primary">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Sisa Waktu: {formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-3xl items-start">
        {/* Navigation list */}
        <Card className="md:col-span-1 shadow-sm border-muted">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-bold">Soal Kuis</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 grid grid-cols-5 gap-2">
            {questions.map((_, idx) => {
              const hasAnswer = answers[questions[idx].id] !== undefined && 
                (Array.isArray(answers[questions[idx].id]) ? (answers[questions[idx].id] as string[]).length > 0 : true);
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 w-9 text-xs rounded-md font-bold transition-all border ${
                    idx === currentIndex
                      ? 'bg-primary text-primary-foreground border-primary'
                      : hasAnswer
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Question Area */}
        <Card className="md:col-span-3 shadow-md">
          <CardHeader>
            <div className="text-xs font-semibold text-muted-foreground uppercase">
              Pertanyaan {currentIndex + 1} dari {questions.length}
            </div>
            <CardTitle className="text-lg font-bold mt-2 leading-relaxed">
              {currentQuestion?.question}
            </CardTitle>
            {isMultiSelect && (
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-200 rounded w-max mt-2 block">
                Pilih semua opsi yang benar
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {currentQuestion?.choices.map((choice) => {
              const selectedValue = answers[currentQuestion.id];
              const isSelected = isMultiSelect
                ? Array.isArray(selectedValue) && (selectedValue as string[]).includes(choice.label)
                : selectedValue === choice.label;

              return (
                <button
                  key={choice.id}
                  onClick={() => handleSelectAnswer(currentQuestion.id, choice.label, isMultiSelect)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-primary/5 border-primary text-foreground font-semibold shadow-sm'
                      : 'hover:bg-muted border-input text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-6 w-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-input group-hover:border-primary/50'
                      }`}
                    >
                      {choice.label}
                    </span>
                    <span>{choice.value}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((x) => Math.max(0, x - 1))}
              disabled={currentIndex === 0}
            >
              Sebelumnya
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button onClick={() => setCurrentIndex((x) => x + 1)}>Selanjutnya</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="bg-green-600 hover:bg-green-700">
                {submitMutation.isPending ? 'Mengirim...' : 'Kumpulkan'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
