import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { InternalPluginManifest } from "@lms/shared";
import { PluginManifestValidator } from "./plugin-manifest-validator.service";

const validManifest: InternalPluginManifest = {
  key: "test.activity",
  name: "Test Activity",
  version: "1.0.0",
  category: "ACTIVITY",
  activityTypes: [{ key: "test.activity", name: "Test Activity" }],
  capabilities: ["render_activity"],
};

describe("PluginManifestValidator", () => {
  it("accepts structurally valid manifests", () => {
    const validator = new PluginManifestValidator();

    expect(() => validator.validate(validManifest)).not.toThrow();
  });

  it("rejects duplicate plugin keys", () => {
    const validator = new PluginManifestValidator();

    expect(() =>
      validator.validateAll([validManifest, { ...validManifest }]),
    ).toThrow(BadRequestException);
  });

  it("rejects unsafe capabilities", () => {
    const validator = new PluginManifestValidator();

    expect(() =>
      validator.validate({
        ...validManifest,
        capabilities: ["execute_untrusted_code"],
      }),
    ).toThrow(BadRequestException);
  });
});
