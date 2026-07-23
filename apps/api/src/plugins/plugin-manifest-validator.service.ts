import { BadRequestException, Injectable } from "@nestjs/common";
import {
  isValidPluginCategory,
  PLUGIN_DISTRIBUTIONS,
  PLUGIN_RUNTIME_KINDS,
  type InternalPluginManifest,
} from "@lms/shared";

const unsafeCapabilities = new Set([
  "execute_untrusted_code",
  "dynamic_import",
  "filesystem_write",
  "network_unrestricted",
]);

@Injectable()
export class PluginManifestValidator {
  validate(manifest: InternalPluginManifest) {
    if (!manifest.key?.trim()) {
      throw new BadRequestException("Plugin key is required");
    }
    if (!manifest.name?.trim()) {
      throw new BadRequestException("Plugin name is required");
    }
    if (!manifest.version?.trim()) {
      throw new BadRequestException("Plugin version is required");
    }
    if (!isValidPluginCategory(manifest.category)) {
      throw new BadRequestException("Plugin category is invalid");
    }
    if (!PLUGIN_DISTRIBUTIONS.includes(manifest.distribution)) {
      throw new BadRequestException("Plugin distribution is invalid");
    }
    if (!PLUGIN_RUNTIME_KINDS.includes(manifest.runtime?.kind)) {
      throw new BadRequestException("Plugin runtime is invalid");
    }
    if (manifest.distribution === "CORE" && !manifest.key.startsWith("core.")) {
      throw new BadRequestException(
        "Core plugin keys must use the core namespace",
      );
    }
    if (
      manifest.distribution === "MARKETPLACE" &&
      !manifest.key.startsWith("plugin.")
    ) {
      throw new BadRequestException(
        "Marketplace plugin keys must use the plugin namespace",
      );
    }
    if (
      manifest.runtime.kind === "REMOTE_IFRAME" &&
      !this.isHttpsUrl(manifest.runtime.entrypoint)
    ) {
      throw new BadRequestException(
        "Remote iframe plugins require an HTTPS entrypoint",
      );
    }
    for (const capability of manifest.capabilities ?? []) {
      if (unsafeCapabilities.has(capability)) {
        throw new BadRequestException(
          `Plugin capability is not allowed: ${capability}`,
        );
      }
    }
    for (const activityType of manifest.activityTypes ?? []) {
      if (!activityType.key?.trim() || !activityType.name?.trim()) {
        throw new BadRequestException(
          "Plugin activity types require key and name",
        );
      }
      if (
        manifest.distribution === "MARKETPLACE" &&
        !activityType.key.startsWith(`${manifest.key}.`) &&
        activityType.key !== manifest.key
      ) {
        throw new BadRequestException(
          `Activity type ${activityType.key} must use plugin namespace ${manifest.key}`,
        );
      }
    }
  }

  validateAll(manifests: InternalPluginManifest[]) {
    const seen = new Set<string>();
    for (const manifest of manifests) {
      this.validate(manifest);
      if (seen.has(manifest.key)) {
        throw new BadRequestException(`Duplicate plugin key: ${manifest.key}`);
      }
      seen.add(manifest.key);
    }
    for (const manifest of manifests) {
      for (const dependency of manifest.dependencies ?? []) {
        if (dependency === manifest.key) {
          throw new BadRequestException(
            `Plugin ${manifest.key} cannot depend on itself`,
          );
        }
        if (!seen.has(dependency)) {
          throw new BadRequestException(
            `Plugin ${manifest.key} has unknown dependency: ${dependency}`,
          );
        }
      }
      const secretKeys = new Set<string>();
      for (const secret of manifest.secretConfig ?? []) {
        if (!secret.key?.trim() || !secret.label?.trim()) {
          throw new BadRequestException(
            `Plugin ${manifest.key} secret config requires key and label`,
          );
        }
        if (secretKeys.has(secret.key)) {
          throw new BadRequestException(
            `Plugin ${manifest.key} has duplicate secret config: ${secret.key}`,
          );
        }
        secretKeys.add(secret.key);
      }
    }
  }

  private isHttpsUrl(value?: string) {
    if (!value) return false;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }
}
