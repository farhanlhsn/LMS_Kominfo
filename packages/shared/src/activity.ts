export const CORE_ACTIVITY_TYPES = {
  text: "core.text",
  video: "core.video",
  quiz: "core.quiz",
  assignment: "core.assignment"
} as const;

export type CoreActivityType =
  (typeof CORE_ACTIVITY_TYPES)[keyof typeof CORE_ACTIVITY_TYPES];
