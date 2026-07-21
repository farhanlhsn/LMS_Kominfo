import type { LucideIcon } from "lucide-react";
import { createElement, type ReactNode } from "react";
import {
  BarChart3,
  CheckSquare,
  CircleDot,
  ClipboardList,
  FileBarChart,
  ListChecks,
  MessageSquareQuote,
  Sparkles,
  Square,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { EmptyState } from "../ui/states";
import { StatusBadge } from "../ui/core";
import {
  feedbackAverage,
  feedbackStars,
  feedbackToneFor,
  formatPercent,
  isSurveyOpen,
  pollVotePercentage,
} from "./experiences-helpers";
import type {
  CourseFeedbackEntry,
  CourseFeedbackListResponse,
  Poll,
  PollResults,
  Survey,
  SurveyResponse as SurveyResponseEntry,
  SurveyWithQuestions,
  XapiStatement,
} from "../../lib/lms-types";

function MetaRow({ children }: { children: ReactNode }) {
  return <div className="text-xs text-muted-foreground">{children}</div>;
}

export function SurveysList({ surveys }: { surveys: Survey[] }) {
  if (surveys.length === 0) {
    return createElement(EmptyState, {
      title: "No surveys yet",
      description: "Create a survey to collect learner feedback.",
      icon: ClipboardList,
    });
  }
  return (
    <ul className="space-y-3">
      {surveys.map((survey) => {
        const status = survey.status === "PUBLISHED" && isSurveyOpen(survey) ? "OPEN" : survey.status;
        return (
          <li
            key={survey.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-subtle"
          >
            <div>
              <p className="font-semibold text-foreground">{survey.title}</p>
              <MetaRow>
                {survey._count?.questions ?? 0} question
                {(survey._count?.questions ?? 0) === 1 ? "" : "s"} ·{" "}
                {survey._count?.responses ?? 0} response
                {(survey._count?.responses ?? 0) === 1 ? "" : "s"}
              </MetaRow>
            </div>
            <StatusBadge
              value={status}
              tone={status === "OPEN" ? "success" : status === "CLOSED" ? "danger" : "neutral"}
            />
          </li>
        );
      })}
    </ul>
  );
}

export function SurveyQuestionList({ survey }: { survey: SurveyWithQuestions | null }) {
  if (!survey?.questions?.length) {
    return createElement(EmptyState, {
      title: "No questions",
      description: "Add questions to this survey.",
      icon: ListChecks,
    });
  }
  return (
    <ol className="space-y-3">
      {survey.questions.map((question, idx) => (
        <li
          key={question.id}
          className="rounded-lg border border-border bg-card p-4 shadow-subtle"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Q{idx + 1} · {question.type}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{question.prompt}</p>
              {question.helpText ? (
                <p className="mt-1 text-xs text-muted-foreground">{question.helpText}</p>
              ) : null}
            </div>
            {question.required ? (
              <StatusBadge value="Required" tone="warning" />
            ) : null}
          </div>
          {question.options.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-foreground">
              {question.options.map((opt) => (
                <li key={opt.id} className="flex items-center gap-2">
                  <Square aria-hidden="true" className="h-3 w-3" />
                  {opt.label}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function SurveyResponseList({ responses }: { responses: SurveyResponseEntry[] }) {
  if (responses.length === 0) {
    return createElement(EmptyState, {
      title: "No responses yet",
      description: "Responses will appear here as learners submit.",
      icon: BarChart3,
    });
  }
  return (
    <ul className="space-y-3">
      {responses.map((response) => (
        <li
          key={response.id}
          className="rounded-lg border border-border bg-card p-4 shadow-subtle"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {response.user?.name ?? response.user?.email ?? "Anonymous"}
            </p>
            <span className="text-xs text-muted-foreground">
              {new Date(response.submittedAt).toLocaleString()}
            </span>
          </div>
          {response.answers && response.answers.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {response.answers.map((answer) => (
                <li key={answer.id}>
                  <span className="font-medium text-foreground">
                    {String(answer.value)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function PollsList({ polls }: { polls: Poll[] }) {
  if (polls.length === 0) {
    return createElement(EmptyState, {
      title: "No polls yet",
      description: "Create a poll to gather quick learner input.",
      icon: CircleDot,
    });
  }
  return (
    <ul className="space-y-3">
      {polls.map((poll) => (
        <li
          key={poll.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-subtle"
        >
          <div>
            <p className="font-semibold text-foreground">{poll.question}</p>
            <MetaRow>
              {poll.options.length} options · {poll._count?.votes ?? 0} votes
            </MetaRow>
          </div>
          <StatusBadge
            value={poll.status}
            tone={
              poll.status === "ACTIVE"
                ? "success"
                : poll.status === "CLOSED"
                  ? "neutral"
                  : "warning"
            }
          />
        </li>
      ))}
    </ul>
  );
}

export function PollResultsView({ results }: { results: PollResults | null }) {
  if (!results) {
    return createElement(EmptyState, {
      title: "No results",
      description: "Poll results will be shown after learners vote.",
      icon: BarChart3,
    });
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{results.poll.question}</p>
        <p className="text-xs text-muted-foreground">{results.totalVotes} total votes</p>
      </div>
      <ul className="space-y-2">
        {results.options.map((opt) => (
          <li key={opt.id} className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between text-sm font-medium text-foreground">
              <span>{opt.label}</span>
              <span>
                {opt.votes} · {formatPercent(opt.votes, results.totalVotes)}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div
                aria-hidden="true"
                className="h-2 rounded-full bg-primary"
                style={{ width: `${pollVotePercentage(results, opt.id)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CourseFeedbackSummary({ data }: { data: CourseFeedbackListResponse | null }) {
  if (!data || data.data.length === 0) {
    return createElement(EmptyState, {
      title: "No feedback yet",
      description: "Course feedback will appear here as learners respond.",
      icon: MessageSquareQuote,
    });
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-subtle">
        <Sparkles aria-hidden="true" className="h-5 w-5 text-primary" />
        <div>
          <p className="text-2xl font-semibold text-foreground">
            {data.average.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">
            {feedbackStars(data.average)} · {data.totalFeedback} response
            {data.totalFeedback === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <FeedbackList items={data.data} />
    </div>
  );
}

export function FeedbackList({ items }: { items: CourseFeedbackEntry[] }) {
  if (items.length === 0) {
    return createElement(EmptyState, {
      title: "No feedback yet",
      description: "Feedback will appear here as learners respond.",
      icon: MessageSquareQuote,
    });
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const tone = feedbackToneFor(item.rating);
        return (
          <li
            key={item.id}
            className="rounded-lg border border-border bg-card p-3 shadow-subtle"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {item.user?.name ?? item.user?.email ?? "Anonymous"}
              </p>
              <StatusBadge value={`${item.rating}/5`} tone={tone} />
            </div>
            {item.comment ? (
              <p className="mt-1 text-xs text-muted-foreground">{item.comment}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function CourseFeedbackWidget({ items }: { items: CourseFeedbackEntry[] }) {
  if (items.length === 0) {
    return createElement(EmptyState, {
      title: "No feedback for this course yet",
      description: "Be the first to share your experience.",
      icon: MessageSquareQuote,
    });
  }
  const avg = feedbackAverage(items);
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-subtle">
      <div className="flex items-center gap-3">
        <p className="text-2xl font-semibold text-foreground">{avg.toFixed(1)}</p>
        <p className="text-sm text-muted-foreground">
          {feedbackStars(avg)} · {items.length} reviews
        </p>
      </div>
      <FeedbackList items={items.slice(0, 3)} />
    </div>
  );
}

export function XapiStatementList({ statements }: { statements: XapiStatement[] }) {
  if (statements.length === 0) {
    return createElement(EmptyState, {
      title: "No xAPI statements yet",
      description: "Activity completions and interactions will appear here.",
      icon: FileBarChart,
    });
  }
  return (
    <ul className="space-y-2">
      {statements.map((statement) => (
        <li
          key={statement.id}
          className="rounded-md border border-border bg-card p-3 text-xs shadow-subtle"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono font-semibold text-foreground">
              {String(statement.verb?.id ?? "experienced")}
            </span>
            <span className="text-muted-foreground">
              {new Date(statement.stored).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">
            {String(statement.object?.id ?? "")}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ScormLauncher({
  title,
  version,
  entryUrl,
}: {
  title: string;
  version: string;
  entryUrl?: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-subtle">
      <div className="flex items-center gap-2">
        <CheckSquare aria-hidden="true" className="h-5 w-5 text-primary" />
        <p className="font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        SCORM {version} content package. The runtime bridge is connected to the
        backend attempt service for launch state, score commits, and progress
        tracking.
      </p>
      {entryUrl ? (
        <a
          className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
          href={entryUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open entry URL
        </a>
      ) : null}
    </div>
  );
}

export function H5PLauncher({
  title,
  library,
}: {
  title: string;
  library: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-subtle">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        H5P library: {library}. Results are tracked through the H5P activity
        endpoints and can be reported through the xAPI pipeline.
      </p>
    </div>
  );
}

export const ScormLauncherPlaceholder = ScormLauncher;
export const H5PLauncherPlaceholder = H5PLauncher;

export function ExperiencesIconBadge({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground",
      )}
    >
      <Icon aria-hidden="true" className="h-3 w-3" />
      {label}
    </span>
  );
}

export const ExperienceViews = {
  SurveysList,
  SurveyQuestionList,
  SurveyResponseList,
  PollsList,
  PollResultsView,
  CourseFeedbackSummary,
  FeedbackList,
  CourseFeedbackWidget,
  XapiStatementList,
  ScormLauncher,
  H5PLauncher,
  ScormLauncherPlaceholder,
  H5PLauncherPlaceholder,
  ExperiencesIconBadge,
};
