"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  Bot,
  Copy,
  Send,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import {
  useAiStatus,
  useAskAiTutor,
} from "../../../lib/api-hooks";
import { apiBaseUrl, authHeaders, getSession } from "../../../lib/api-client";
import type {
  Activity,
  AiTutorResponse,
  Course,
  Lesson,
} from "../../../lib/lms-types";
import {
  ApiErrorState,
  EmptyState,
  LoadingState,
} from "../../ui/states";
import { PanelFrame, formatTimestamp } from "./panel-shared";

export function AiTutorPanel({
  course,
  lesson,
  activity,
  videoTime,
}: {
  course: Course;
  lesson: Lesson;
  activity: Activity;
  videoTime: number;
}) {
  const status = useAiStatus();
  const askTutor = useAskAiTutor();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [history, setHistory] = useState<
    Array<{ question: string; response: AiTutorResponse }>
  >([]);
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConversationId(undefined);
    setHistory([]);
    setQuestion("");
    setPendingQuestion(null);
    setError(null);
  }, [activity.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, sending]);

  async function submitFeedback(messageId: string, feedback: "LIKE" | "DISLIKE") {
    if (!messageId) return;
    try {
      const session = getSession();
      await fetch(`${apiBaseUrl()}/learn/ai/messages/${messageId}/feedback`, {
        method: "POST",
        headers: authHeaders(session, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ feedback }),
      });
    } catch {
      // Ignore errors for feedback
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).catch(() => undefined);
  }

  async function askTutorWithoutStream(trimmed: string) {
    const result = await askTutor({
      courseId: course.id,
      lessonId: lesson.id,
      activityId: activity.id,
      question: trimmed,
      conversationId,
    });
    setHistory((current) => [
      ...current,
      { question: trimmed, response: result },
    ]);
    setConversationId(result.conversationId);
  }

  async function fallbackToNonStreaming(trimmed: string, cause: unknown) {
    try {
      await askTutorWithoutStream(trimmed);
    } catch {
      const message =
        cause instanceof Error && cause.message
          ? cause.message
          : "AI Tutor could not answer.";
      throw new Error(message);
    }
  }

  async function send(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || sending || status.data?.enabled === false) return;
    setSending(true);
    setPendingQuestion(trimmed);
    setError(null);
    setQuestion("");
    let delivered = false;

    try {
      const session = getSession();
      const response = await fetch(`${apiBaseUrl()}/learn/ai/tutor/stream`, {
        method: "POST",
        headers: authHeaders(session, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          courseId: course.id,
          lessonId: lesson.id,
          activityId: activity.id,
          question: trimmed,
          conversationId,
        }),
      });

      if (!response.ok) {
        let message = "AI Tutor request failed.";
        try {
          const body = await response.json();
          message = body?.error?.message ?? body?.message ?? message;
        } catch {
          message =
            response.status === 429
              ? "AI Tutor is receiving too many requests. Please wait a moment."
              : response.status >= 500
                ? "AI Tutor provider is temporarily unavailable."
                : message;
        }
        await fallbackToNonStreaming(trimmed, new Error(message));
        return;
      }
      if (!response.body) {
        await fallbackToNonStreaming(
          trimmed,
          new Error("AI Tutor stream is unavailable."),
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let streamBuffer = "";
      let streamedAnswer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          streamBuffer += decoder.decode();
          break;
        }

        streamBuffer += decoder.decode(value, { stream: true });
        const events = streamBuffer.split("\n\n");
        streamBuffer = events.pop() ?? "";
        
        for (const event of events) {
          const data = event
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.replace(/^data: /, ""))
            .join("\n")
            .trim();
          if (!data) continue;
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "chunk") {
              streamedAnswer += parsed.text;
            } else if (parsed.type === "done") {
              const result = {
                ...parsed.result,
                answer: parsed.result.answer || streamedAnswer,
              };
              setHistory((current) => [
                ...current,
                { question: trimmed, response: result },
              ]);
              delivered = true;
              setConversationId(parsed.result.conversationId);
            } else if (parsed.type === "error") {
              throw new Error(parsed.message);
            }
          } catch (e) {
            throw new Error(
              e instanceof Error ? e.message : "AI Tutor stream failed.",
              { cause: e },
            );
          }
        }
      }
    } catch (caught) {
      if (!delivered) {
        try {
          await fallbackToNonStreaming(trimmed, caught);
          delivered = true;
        } catch (fallbackError) {
          setError(
            fallbackError instanceof Error
              ? fallbackError.message
              : "AI Tutor could not answer. Please try again.",
          );
        }
      }
    } finally {
      setSending(false);
      setPendingQuestion(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(question);
  }

  const latest = history.at(-1)?.response;

  return (
    <PanelFrame
      icon={<Sparkles aria-hidden="true" className="h-5 w-5 text-primary" />}
      title="AI Tutor"
      scrollable={false}
    >
      {status.loading ? (
        <LoadingState title="Checking AI Tutor" />
      ) : status.error ? (
        <ApiErrorState
          error={status.error}
          fallbackTitle="AI Tutor status unavailable"
        />
      ) : status.data?.enabled === false ? (
        <EmptyState
          title="AI Tutor is disabled"
          description={
            status.data.disabledReason ??
            "Your organization has disabled AI assistance."
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0 rounded-md border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{course.title}</p>
            <p className="mt-1 truncate">
              {lesson.title} / {activity.title}
            </p>
            {videoTime > 0 ? (
              <p className="mt-1">At {formatTimestamp(videoTime)}</p>
            ) : null}
          </div>

          <div aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
            {!history.length ? (
              <EmptyState
                title="Ask about this material"
                description="Answers use accessible course material first, with clearly labeled general educational fallback."
              />
            ) : (
              history.map((entry, index) => (
                <div key={`${entry.question}-${index}`} className="space-y-2">
                  <div className="ml-6 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {entry.question}
                  </div>
                  <article className="rounded-md border border-border bg-background p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.response.sourceType === "COURSE_MATERIAL" ? (
                        <BookOpen
                          aria-hidden="true"
                          className="h-4 w-4 text-primary"
                        />
                      ) : entry.response.sourceType === "BLOCKED" ||
                        entry.response.sourceType === "OUT_OF_SCOPE" ? (
                        <ShieldAlert
                          aria-hidden="true"
                          className="h-4 w-4 text-warning"
                        />
                      ) : (
                        <Sparkles
                          aria-hidden="true"
                          className="h-4 w-4 text-primary"
                        />
                      )}
                      <span className="text-xs font-semibold">
                        {entry.response.sourceLabel}
                      </span>
                      {entry.response.cacheHit ? (
                        <span className="text-xs text-muted-foreground">
                          Cached
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 text-sm leading-6">
                      <ReactMarkdown
                        components={{
                          p: ({ node: _, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({ node: _, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                          ul: ({ node: _, ...props }) => <ul className="mb-3 list-inside list-disc space-y-1" {...props} />,
                          ol: ({ node: _, ...props }) => <ol className="mb-3 list-inside list-decimal space-y-1" {...props} />,
                          li: ({ node: _, ...props }) => <li {...props} />,
                          h1: ({ node: _, ...props }) => <h1 className="mb-2 mt-4 font-bold text-foreground" {...props} />,
                          h2: ({ node: _, ...props }) => <h2 className="mb-2 mt-3 font-semibold text-foreground" {...props} />,
                          h3: ({ node: _, ...props }) => <h3 className="mb-2 mt-3 font-medium text-foreground" {...props} />,
                          h4: ({ node: _, ...props }) => <h4 className="mb-2 mt-3 font-medium text-foreground" {...props} />,
                          code: ({ node: _, className, ...props }) => {
                            const isInline = !className?.includes('language-');
                            return isInline ? (
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground" {...props} />
                            ) : (
                              <code className={className} {...props} />
                            );
                          },
                          pre: ({ node: _, ...props }) => <pre className="mb-3 mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground" {...props} />
                        }}
                      >
                        {entry.response.answer}
                      </ReactMarkdown>
                    </div>
                    {entry.response.citations.length ? (
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Sources
                        </p>
                        <div className="mt-2 space-y-2">
                          {entry.response.citations.map((citation) => (
                            <details
                              key={citation.chunkId}
                              className="rounded-md border border-border p-2"
                            >
                              <summary className="cursor-pointer text-xs font-semibold">
                                {citation.id} {citation.title}
                              </summary>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                {citation.excerpt}
                              </p>
                            </details>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-end gap-2 text-muted-foreground border-t border-border pt-2">
                      <button 
                        type="button" 
                        title="Copy to clipboard"
                        className="hover:text-foreground hover:bg-muted p-1 rounded transition-colors"
                        onClick={() => handleCopy(entry.response.answer)}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {entry.response.messageId ? (
                        <>
                          <button 
                            type="button" 
                            title="Good response"
                            className="hover:text-foreground hover:bg-muted p-1 rounded transition-colors"
                            onClick={() => submitFeedback(entry.response.messageId, "LIKE")}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                          <button 
                            type="button" 
                            title="Bad response"
                            className="hover:text-foreground hover:bg-muted p-1 rounded transition-colors"
                            onClick={() => submitFeedback(entry.response.messageId, "DISLIKE")}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                </div>
              ))
            )}
            {sending ? (
              <div className="space-y-2">
                {pendingQuestion ? (
                  <div className="ml-6 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {pendingQuestion}
                  </div>
                ) : null}
                <LoadingState title="AI Tutor is thinking" />
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>

          <div className="flex shrink-0 flex-col gap-4">
            {latest?.suggestions.length ? (
              <div className="flex flex-wrap gap-2">
                {latest.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className="rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs font-medium hover:bg-muted disabled:opacity-50"
                    disabled={sending}
                    onClick={() => void send(suggestion)}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
            <form
              className="flex shrink-0 items-end gap-2 border-t border-border pt-3"
              onSubmit={submit}
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">Question for AI Tutor</span>
                <textarea
                  className="min-h-20 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  disabled={sending}
                  maxLength={2000}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask about this lesson..."
                  value={question}
                />
              </label>
              <button
                aria-label="Send question"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={sending || question.trim().length < 2}
                title="Send question"
                type="submit"
              >
                <Send aria-hidden="true" className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </PanelFrame>
  );
}
