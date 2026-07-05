export const PROCTORING_EVENT_TYPES = [
  "TAB_SWITCH",
  "FULLSCREEN_EXIT",
  "COPY_PASTE",
  "LOOKING_AWAY",
  "NO_FACE",
  "MULTIPLE_FACES",
  "PHONE_DETECTED",
  "NOISE_DETECTED",
] as const;

export type ProctoringEventType = (typeof PROCTORING_EVENT_TYPES)[number];

export const PROCTORING_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type ProctoringSeverity = (typeof PROCTORING_SEVERITIES)[number];

export const PROCTORING_FLAG_STATUSES = [
  "OPEN",
  "DISMISSED",
  "UPHELD",
] as const;
export type ProctoringFlagStatus = (typeof PROCTORING_FLAG_STATUSES)[number];

export const PROCTORING_SESSION_STATUSES = [
  "ACTIVE",
  "COMPLETED",
  "FLAGGED",
  "REVIEWED",
] as const;
export type ProctoringSessionStatus =
  (typeof PROCTORING_SESSION_STATUSES)[number];

export interface MockProctoringSample {
  type: ProctoringEventType;
  severity: ProctoringSeverity;
  metadata: Record<string, unknown>;
}

export interface ProctoringProvider {
  getIdentifier(): string;
  sampleEvent(): MockProctoringSample;
  computeIntegrityScore(events: Array<{ severity: ProctoringSeverity }>): number;
}

export const PROCTORING_PROVIDER = Symbol("PROCTORING_PROVIDER");
