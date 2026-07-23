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

  it("marks non-educational as off topic when not allowed", () => {
    const strict = new AiRoutingService(
      createAiConfig({
        AI_ENABLED: "true",
        AI_ALLOW_OFF_TOPIC: "false",
        AI_ALLOW_GENERAL_EDUCATIONAL: "false",
      }),
    );
    expect(strict.classify("cuaca hari ini", false)).toBe("OFF_TOPIC");
  });

  // Method name is public API text, not secret material.
  // eslint-disable-next-line no-secrets/no-secrets
  it("classifyWithLocalEmbedding falls back to rules", async () => {
    const route = await service.classifyWithLocalEmbedding(
      "apa itu tcp",
      true,
    );
    expect(route).toBe("COURSE");
  });

  it("uses embedding similarity when classifier enabled", async () => {
    const embedBatch = vi.fn().mockResolvedValue([
      [1, 0],
      [0.9, 0.1],
      [0, 1],
    ]);
    const factory = {
      create: () => ({ embedBatch }),
    };
    const local = new AiRoutingService(
      createAiConfig({
        AI_ENABLED: "true",
        AI_LOCAL_CLASSIFIER_ENABLED: "true",
        AI_ROUTER_MODE: "rules_then_local",
        AI_LOCAL_CLASSIFIER_DOMAIN_SIMILARITY_THRESHOLD: "0.5",
        AI_LOCAL_CLASSIFIER_OFF_TOPIC_SIMILARITY_THRESHOLD: "0.9",
      }),
      factory as any,
    );
    await expect(
      local.classifyWithLocalEmbedding("random hobby question", false),
    ).resolves.toBeDefined();
    expect(embedBatch).toHaveBeenCalled();

    embedBatch.mockResolvedValueOnce([
      [0, 1],
      [1, 0],
      [0.95, 0.05],
    ]);
    await expect(
      local.classifyWithLocalEmbedding("something unrelated", false),
    ).resolves.toBeDefined();
  });
});



