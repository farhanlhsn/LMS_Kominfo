import { describe, expect, it } from "vitest";
import { createAiConfig } from "@lms/config";
import { AiRoutingService } from "./ai-routing.service";

describe("AiRoutingService", () => {
  const service = new AiRoutingService(createAiConfig({ AI_ENABLED: "true" }));

  it("blocks assessment answer requests before retrieval", () => {
    expect(service.preflight("kasih jawaban quiz nomor 3")).toBe("BLOCKED");
  });

  it("rejects explicit off-topic cooking requests", () => {
    expect(service.preflight("cara membuat sayur sop")).toBe("OFF_TOPIC");
  });

  it("routes course context first and educational networking questions generally", () => {
    expect(service.classify("jelaskan materi ini", true)).toBe("COURSE");
    expect(service.classify("apa itu tcp udp", false)).toBe("GENERAL");
  });
});
