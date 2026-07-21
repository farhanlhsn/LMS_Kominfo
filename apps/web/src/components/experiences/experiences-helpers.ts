import type { CourseFeedbackEntry, PollResults, Survey, SurveyWithQuestions } from "../../lib/lms-types";

export function formatPercent(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function feedbackAverage(items: Array<{ rating: number }>) {
  if (items.length === 0) return 0;
  return items.reduce((acc, it) => acc + it.rating, 0) / items.length;
}

export function feedbackToneFor(rating: number): "success" | "warning" | "danger" {
  if (rating >= 4) return "success";
  if (rating >= 3) return "warning";
  return "danger";
}

export function isSurveyOpen(survey: Pick<Survey, "status" | "closesAt">) {
  if (survey.status !== "PUBLISHED") return false;
  if (!survey.closesAt) return true;
  return new Date(survey.closesAt).getTime() > Date.now();
}

export function pollVotePercentage(results: PollResults | null, optionId: string) {
  if (!results || results.totalVotes === 0) return 0;
  const opt = results.options.find((o) => o.id === optionId);
  if (!opt) return 0;
  return Math.round((opt.votes / results.totalVotes) * 100);
}

export function feedbackStars(rating: number) {
  return "★".repeat(Math.max(0, Math.min(5, Math.round(rating)))) +
    "☆".repeat(Math.max(0, 5 - Math.round(rating)));
}

export function summarizeQuestions(survey: SurveyWithQuestions | null | undefined) {
  if (!survey?.questions) return [] as Array<{ id: string; prompt: string; count: number }>;
  return survey.questions.map((q) => ({ id: q.id, prompt: q.prompt, count: 0 }));
}

export function recentFeedbackLabel(item: CourseFeedbackEntry) {
  const user = item.user?.name ?? item.user?.email ?? "Anonymous";
  return `${user} rated ${item.rating}/5`;
}
