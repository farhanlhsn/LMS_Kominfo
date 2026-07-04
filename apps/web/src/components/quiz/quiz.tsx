"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, ListChecks, Save, Send } from "lucide-react";
import { api } from "../../lib/api-client";
import { useLearnerQuiz } from "../../lib/api-hooks";
import type {
  ActivityContentResponse,
  Question,
  QuizAnswer,
  QuizAttempt,
  QuizResult,
} from "../../lib/lms-types";
import { StatusBadge } from "../ui/core";
import { ApiErrorState, EmptyState, LoadingState } from "../ui/states";

type AnswerDraft = {
  selectedOptionIds?: string[];
  textAnswer?: string;
  numericAnswer?: number;
};

export function QuizActivityRenderer({
  response,
}: {
  response: ActivityContentResponse;
}) {
  const activityId = response.activity.id;
  const quizQuery = useLearnerQuiz(activityId);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const lastAttempt = quizQuery.data?.lastAttempt;
    if (lastAttempt?.status === "IN_PROGRESS") {
      setAttempt(lastAttempt);
      const next: Record<string, AnswerDraft> = {};
      for (const answer of lastAttempt.answers ?? []) {
        next[answer.questionId] = {
          selectedOptionIds: answer.selectedOptionIds ?? [],
          textAnswer: answer.textAnswer ?? "",
          numericAnswer: answer.numericAnswer ?? undefined,
        };
      }
      setAnswers(next);
    }
  }, [quizQuery.data?.lastAttempt]);

  useEffect(() => {
    if (!attempt?.dueAt || result) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.dueAt, result]);

  const remainingLabel = useMemo(() => {
    if (!attempt?.dueAt) return null;
    const remainingMs = Math.max(new Date(attempt.dueAt).getTime() - now, 0);
    const minutes = Math.floor(remainingMs / 60_000);
    const seconds = Math.floor((remainingMs % 60_000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [attempt?.dueAt, now]);

  async function start() {
    setMessage(null);
    setAttempt(await api.startQuizAttempt(activityId));
  }

  async function save(questionId: string) {
    if (!attempt) return;
    setMessage(null);
    await api.saveQuizAnswer(attempt.id, {
      questionId,
      ...(answers[questionId] ?? {}),
    });
    setMessage("Answer saved.");
  }

  async function submit() {
    if (!attempt) return;
    if (!window.confirm("Submit this quiz attempt? You cannot edit after submitting.")) {
      return;
    }
    setMessage(null);
    setResult(await api.submitQuizAttempt(attempt.id));
    await quizQuery.reload();
  }

  if (quizQuery.loading) return <LoadingState title="Loading quiz" />;
  if (quizQuery.error || !quizQuery.data) {
    return (
      <ApiErrorState
        error={quizQuery.error}
        fallbackTitle="Could not load quiz"
      />
    );
  }

  const quiz = quizQuery.data.quiz;
  const finalResult = result;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-subtle">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Quiz</p>
          <h2 className="mt-1 text-xl font-semibold">{quiz.title}</h2>
          {quiz.description ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {quiz.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={`${quiz.passingScorePercent}% pass`} />
          <StatusBadge value={`${quiz.attemptLimit} attempts`} />
          {quiz.timeLimitMinutes ? (
            <StatusBadge value={`${quiz.timeLimitMinutes} min`} />
          ) : null}
        </div>
      </div>

      {!attempt && !finalResult ? (
        <div className="mt-5">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() => void start()}
            type="button"
          >
            <ListChecks aria-hidden="true" className="h-4 w-4" />
            Start quiz
          </button>
        </div>
      ) : null}

      {remainingLabel && !finalResult ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Clock aria-hidden="true" className="h-4 w-4 text-primary" />
          Time remaining {remainingLabel}
        </p>
      ) : null}

      {finalResult ? (
        <QuizResultPanel result={finalResult} />
      ) : attempt ? (
        <div className="mt-5 grid gap-4">
          {quiz.questions?.length ? (
            quiz.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                index={index}
                question={question}
                value={answers[question.id] ?? {}}
                onChange={(value) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: value,
                  }))
                }
                onSave={() => void save(question.id)}
              />
            ))
          ) : (
            <EmptyState
              title="No questions"
              description="This quiz has no published questions."
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              onClick={() => void submit()}
              type="button"
            >
              <Send aria-hidden="true" className="h-4 w-4" />
              Submit quiz
            </button>
            {message ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function QuestionCard({
  question,
  index,
  value,
  onChange,
  onSave,
}: {
  question: Question;
  index: number;
  value: AnswerDraft;
  onChange: (value: AnswerDraft) => void;
  onSave: () => void;
}) {
  return (
    <article className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Question {index + 1}
          </p>
          <h3 className="mt-1 text-base font-semibold">{question.prompt}</h3>
        </div>
        <StatusBadge value={`${question.points} pt`} />
      </div>
      <div className="mt-4">
        {renderQuestionInput(question, value, onChange)}
      </div>
      <button
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
        onClick={onSave}
        type="button"
      >
        <Save aria-hidden="true" className="h-4 w-4" />
        Save answer
      </button>
    </article>
  );
}

function renderQuestionInput(
  question: Question,
  value: AnswerDraft,
  onChange: (value: AnswerDraft) => void,
) {
  if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
    return (
      <div className="grid gap-2">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <input
              checked={value.selectedOptionIds?.[0] === option.id}
              name={question.id}
              onChange={() => onChange({ selectedOptionIds: [option.id] })}
              type="radio"
            />
            {option.text}
          </label>
        ))}
      </div>
    );
  }
  if (question.type === "MULTIPLE_ANSWER") {
    const selected = new Set(value.selectedOptionIds ?? []);
    return (
      <div className="grid gap-2">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <input
              checked={selected.has(option.id)}
              onChange={(event) => {
                const next = new Set(selected);
                if (event.target.checked) next.add(option.id);
                else next.delete(option.id);
                onChange({ selectedOptionIds: [...next] });
              }}
              type="checkbox"
            />
            {option.text}
          </label>
        ))}
      </div>
    );
  }
  if (question.type === "NUMERIC") {
    return (
      <input
        className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
        onChange={(event) =>
          onChange({ numericAnswer: Number(event.target.value) })
        }
        type="number"
        value={value.numericAnswer ?? ""}
      />
    );
  }
  return (
    <textarea
      className="min-h-32 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
      onChange={(event) => onChange({ textAnswer: event.target.value })}
      value={value.textAnswer ?? ""}
    />
  );
}

function QuizResultPanel({ result }: { result: QuizResult }) {
  const answerByQuestion = new Map(
    result.answers.map((answer) => [answer.questionId, answer]),
  );
  return (
    <div className="mt-5 grid gap-4">
      <div className="rounded-md border border-border bg-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Result</p>
            <p className="mt-1 text-2xl font-semibold">
              {Math.round(result.attempt.percentage)}%
            </p>
          </div>
          <StatusBadge
            tone={result.attempt.passed ? "success" : "warning"}
            value={
              result.attempt.status === "NEEDS_MANUAL_GRADING"
                ? "Needs grading"
                : result.attempt.passed
                  ? "Passed"
                  : "Not passed"
            }
          />
        </div>
      </div>
      {result.quiz.questions?.map((question, index) => {
        const answer = answerByQuestion.get(question.id);
        return (
          <article key={question.id} className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-sm font-semibold">
                {index + 1}. {question.prompt}
              </h3>
              {answer ? <AnswerStatus answer={answer} /> : null}
            </div>
            {question.explanation ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {question.explanation}
              </p>
            ) : null}
            {answer?.feedback ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {answer.feedback}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function AnswerStatus({ answer }: { answer: QuizAnswer }) {
  if (answer.status === "NEEDS_MANUAL_GRADING") {
    return <StatusBadge tone="warning" value="Manual grading" />;
  }
  if (answer.isCorrect) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        Correct
      </span>
    );
  }
  return <StatusBadge tone="danger" value="Incorrect" />;
}
