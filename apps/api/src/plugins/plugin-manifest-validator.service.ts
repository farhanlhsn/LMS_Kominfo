import { BadRequestException, Injectable } from "@nestjs/common";
import {
  isValidPluginCategory,
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
    for (const capability of manifest.capabilities ?? []) {
      if (unsafeCapabilities.has(capability)) {
        throw new BadRequestException(
          `Plugin capability is not allowed: ${capability}`,
        );
      }
    }
    for (const activityType of manifest.activityTypes ?? []) {
      if (!activityType.key?.trim() || !activityType.name?.trim()) {
        throw new BadRequestException("Plugin activity types require key and name");
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
  }
}
