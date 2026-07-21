import { Injectable } from "@nestjs/common";
import {
  PROCTORING_EVENT_TYPES,
  PROCTORING_SEVERITIES,
  ProctoringProvider,
  MockProctoringSample,
} from "./proctoring.provider";

@Injectable()
export class MockProctoringProvider implements ProctoringProvider {
  getIdentifier(): string {
    return "mock";
  }

  sampleEvent(): MockProctoringSample {
    const type =
      PROCTORING_EVENT_TYPES[
        Math.floor(Math.random() * PROCTORING_EVENT_TYPES.length)
      ];
    const severity =
      PROCTORING_SEVERITIES[
        Math.floor(Math.random() * PROCTORING_SEVERITIES.length)
      ];
    return {
      type: type!,
      severity: severity!,
      metadata: {
        capturedAt: new Date().toISOString(),
        simulated: true,
      },
    };
  }

  computeIntegrityScore(events: Array<{ severity: "LOW" | "MEDIUM" | "HIGH" }>): number {
    if (events.length === 0) return 1;
    const weights = { LOW: 0.02, MEDIUM: 0.06, HIGH: 0.15 } as const;
    const totalPenalty = events.reduce(
      (sum, e) => sum + weights[e.severity],
      0,
    );
    const score = Math.max(0, 1 - totalPenalty);
    return Number(score.toFixed(4));
  }
}
