import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { PluginRegistry } from "./plugin-registry.service";

@Injectable()
export class PluginSecretService {
  private readonly encryptionKey: Buffer;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PluginRegistry) private readonly registry: PluginRegistry,
  ) {
    const configuredKey =
      process.env.PLUGIN_SECRET_ENCRYPTION_KEY?.trim() ||
      process.env.ENTERPRISE_SECRET_KEY?.trim();
    if (!configuredKey && process.env.NODE_ENV === "production") {
      throw new Error(
        "PLUGIN_SECRET_ENCRYPTION_KEY is required in production",
      );
    }
    this.encryptionKey = createHash("sha256")
      .update(configuredKey ?? "lms-development-plugin-secret-key")
      .digest();
  }

  async listMetadata(organizationId: string, pluginKey: string) {
    const plugin = await this.findPlugin(pluginKey);
    const secrets = await this.prisma.pluginSecret.findMany({
      where: { organizationId, pluginId: plugin.id },
      select: { key: true, lastFour: true, updatedAt: true },
      orderBy: { key: "asc" },
    });
    return secrets.map((secret) => ({
      ...secret,
      configured: true,
    }));
  }

  async set(
    organizationId: string,
    pluginKey: string,
    key: string,
    value: string,
  ) {
    this.assertDeclaredSecret(pluginKey, key);
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException("Secret value cannot be empty");
    }
    const plugin = await this.findPlugin(pluginKey);
    const encryptedValue = this.encrypt(normalized);
    return this.prisma.pluginSecret.upsert({
      where: {
        organizationId_pluginId_key: {
          organizationId,
          pluginId: plugin.id,
          key,
        },
      },
      update: {
        encryptedValue,
        lastFour: normalized.slice(-4),
      },
      create: {
        organizationId,
        pluginId: plugin.id,
        key,
        encryptedValue,
        lastFour: normalized.slice(-4),
      },
      select: { key: true, lastFour: true, updatedAt: true },
    });
  }

  async get(
    organizationId: string,
    pluginKey: string,
    key: string,
  ): Promise<string | null> {
    this.assertDeclaredSecret(pluginKey, key);
    const plugin = await this.findPlugin(pluginKey);
    const secret = await this.prisma.pluginSecret.findUnique({
      where: {
        organizationId_pluginId_key: {
          organizationId,
          pluginId: plugin.id,
          key,
        },
      },
      select: { encryptedValue: true },
    });
    return secret ? this.decrypt(secret.encryptedValue) : null;
  }

  async delete(organizationId: string, pluginKey: string, key: string) {
    this.assertDeclaredSecret(pluginKey, key);
    const plugin = await this.findPlugin(pluginKey);
    await this.prisma.pluginSecret.deleteMany({
      where: { organizationId, pluginId: plugin.id, key },
    });
    return { deleted: true };
  }

  private assertDeclaredSecret(pluginKey: string, key: string) {
    const manifest = this.registry.getPlugin(pluginKey);
    if (!(manifest.secretConfig ?? []).some((secret) => secret.key === key)) {
      throw new BadRequestException(
        `Secret ${key} is not declared by plugin ${pluginKey}`,
      );
    }
  }

  private async findPlugin(pluginKey: string) {
    let plugin = await this.prisma.plugin.findUnique({
      where: { key: pluginKey },
      select: { id: true },
    });
    if (!plugin) {
      await this.registry.ensureRegisteredPlugins();
      plugin = await this.prisma.plugin.findUnique({
        where: { key: pluginKey },
        select: { id: true },
      });
    }
    if (!plugin) throw new NotFoundException("Plugin not found");
    return plugin;
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  private decrypt(value: string) {
    const [version, iv, tag, encrypted] = value.split(".");
    if (version !== "v1" || !iv || !tag || !encrypted) {
      throw new Error("Unsupported encrypted plugin secret");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
