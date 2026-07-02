'use client';

import React, { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Check, X, Award, AlertTriangle, ArrowRight, RotateCcw, HelpCircle } from 'lucide-react';
import { api } from '@/lib/api-client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Choice {
  id: string;
  label: string;
  value: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  question: string;
  choices: Choice[];
  type: string;
}

interface QuizAnswerResult {
  id: string;
  answer: string | string[];
  score: number;
  question: Question;
}

interface AttemptResult {
  id: string;
  score: number;
  passed: boolean;
  quizId: string;
  quiz: {
    title: string;
    passingScore: number;
  };
  answers: QuizAnswerResult[];
}

export default function QuizResultPage(props: { params: Promise<{ id: string }> }): React.ReactElement {
  const router = useRouter();
  const attemptId = use(props.params).id;

  const { data: attempt, isLoading, error } = useQuery<AttemptResult>({
    queryKey: ['attempt-result', attemptId],
    queryFn: () => api.get(`/quizzes/${attemptId}/result`),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <CardTitle>Error</CardTitle>
            <CardDescription>Gagal memuat hasil kuis.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => router.push('/dashboard')}>Kembali ke Dashboard</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Result summary card */}
        <Card className={`shadow-md border-t-8 ${attempt.passed ? 'border-t-green-500' : 'border-t-red-500'}`}>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              {attempt.passed ? (
                <div className="p-3 rounded-full bg-green-50 text-green-500 border border-green-200">
                  <Award className="h-10 w-10" />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-red-50 text-red-500 border border-red-200">
                  <AlertTriangle className="h-10 w-10" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-extrabold">Hasil Kuis: {attempt.quiz.title}</CardTitle>
            <CardDescription className="text-sm mt-1">
              Status kelulusan Anda dan riwayat jawaban tercatat di bawah ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="text-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">Skor Anda</span>
              <span className={`text-6xl font-black mt-1 block ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                {attempt.score}%
              </span>
            </div>
            <div className="text-sm border rounded-full px-4 py-1 bg-muted/40 font-medium">
              Target Kelulusan: <span className="font-bold">{attempt.quiz.passingScore}%</span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4 bg-muted/10">
            <Button variant="outline" onClick={() => router.push(`/quiz/${attempt.quizId}`)} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Coba Lagi
            </Button>
            <Button onClick={() => router.push('/dashboard')} className="gap-2">
              Kembali ke Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* Detailed answers review */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Tinjauan Jawaban
          </h2>

          {attempt.answers.map((answer, idx) => {
            const question = answer.question;
            const isCorrect = answer.score > 0;
            const isMultiSelect = question.type === 'MULTIPLE_SELECT';

            return (
              <Card key={answer.id} className="shadow-sm border-l-4 border-l-muted">
                <CardHeader className="p-4 flex flex-row items-start justify-between gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Soal {idx + 1}</span>
                    <CardTitle className="text-base font-bold mt-1 leading-relaxed">
                      {question.question}
                    </CardTitle>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 ${
                      isCorrect
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <Check className="h-3 w-3" /> Benar
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3" /> Salah
                      </>
                    )}
                  </span>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {question.choices.map((choice) => {
                    const isChoiceSelected = isMultiSelect
                      ? Array.isArray(answer.answer) && (answer.answer as string[]).includes(choice.label)
                      : answer.answer === choice.label;

                    return (
                      <div
                        key={choice.id}
                        className={`p-3 rounded-lg border text-sm flex items-center justify-between ${
                          choice.isCorrect
                            ? 'bg-green-50 border-green-200 text-green-800 font-semibold'
                            : isChoiceSelected
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-background border-input text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-5 w-5 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 ${
                              choice.isCorrect
                                ? 'bg-green-500 text-white border-green-500'
                                : isChoiceSelected
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-background border-input'
                            }`}
                          >
                            {choice.label}
                          </span>
                          <span>{choice.value}</span>
                        </div>
                        {choice.isCorrect && (
                          <span className="text-xs text-green-600 font-medium">Jawaban Benar</span>
                        )}
                        {!choice.isCorrect && isChoiceSelected && (
                          <span className="text-xs text-red-600 font-medium">Pilihan Anda</span>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
