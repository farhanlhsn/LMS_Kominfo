import { describe, expect, it } from "vitest";
import { cuesToTranscriptSegments, parseCaptionContent } from "./video-caption.util";

describe("video-caption.util", () => {
  it("parses WebVTT cues into normalized caption data", () => {
    const cues = parseCaptionContent(
      "WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nHello learner.\n\n00:00:04.000 --> 00:00:06.000\nWelcome back.",
    );

    expect(cues).toEqual([
      { startSeconds: 1, endSeconds: 3.5, text: "Hello learner." },
      { startSeconds: 4, endSeconds: 6, text: "Welcome back." },
    ]);
  });

  it("derives transcript segments from caption cues", () => {
    const segments = cuesToTranscriptSegments(
      [{ startSeconds: 2, endSeconds: 5, text: "Accessibility matters." }],
      "en",
    );

    expect(segments[0]).toMatchObject({
      startSeconds: 2,
      endSeconds: 5,
      text: "Accessibility matters.",
      language: "en",
      orderIndex: 0,
    });
  });
});
