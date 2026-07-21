import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  icon?: string;
  data?: Record<string, unknown>;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  expiresAt?: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PushService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private allowedHosts() {
    return (process.env.PUSH_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  private get vapidPublicKey() {
    return process.env.PUSH_VAPID_PUBLIC_KEY ?? null;
  }

  private get vapidPrivateKey() {
    return process.env.PUSH_VAPID_PRIVATE_KEY ?? null;
  }

  private get vapidSubject() {
    return process.env.PUSH_VAPID_SUBJECT ?? "mailto:admin@example.com";
  }

  getVapidPublicKey() {
    return this.vapidPublicKey;
  }

  isConfigured() {
    return Boolean(this.vapidPublicKey && this.vapidPrivateKey);
  }

  async subscribe(
    organizationId: string,
    userId: string,
    input: PushSubscriptionInput,
    options?: { userAgent?: string; expiresAt?: Date; metadata?: Record<string, unknown> },
  ): Promise<PushSubscriptionRecord> {
    if (!input?.endpoint || !input.keys?.p256dh || !input.keys?.auth) {
      throw new Error("Invalid push subscription payload");
    }
    const endpoint = this.validateEndpoint(input.endpoint);
    const record = await this.prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId, endpoint },
      },
      create: {
        organizationId,
        userId,
        endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: options?.userAgent,
        expiresAt: options?.expiresAt,
        metadata: (options?.metadata ?? {}) as any,
      },
      update: {
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: options?.userAgent,
        expiresAt: options?.expiresAt,
        metadata: (options?.metadata ?? {}) as any,
        lastUsedAt: new Date(),
      },
    });
    return record as PushSubscriptionRecord;
  }

  async unsubscribe(userId: string, endpoint: string) {
    const normalizedEndpoint = this.validateEndpoint(endpoint);
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint: normalizedEndpoint },
    });
    return { unsubscribed: result.count > 0 };
  }

  async getSubscriptions(userId: string) {
    const records = await this.prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return records.map((r) => ({
      id: r.id,
      endpoint: r.endpoint,
      keys: { p256dh: r.p256dh, auth: r.auth },
      userAgent: r.userAgent,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    }));
  }

  async sendToUser(
    organizationId: string,
    userId: string,
    payload: PushPayload,
  ) {
    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId, organizationId },
      take: 50,
    });
    const result = { attempted: subs.length, delivered: 0, failed: 0, removed: 0 };
    if (subs.length === 0) return result;

    for (const sub of subs) {
      if (sub.expiresAt && sub.expiresAt.getTime() < Date.now()) {
        await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
        result.removed += 1;
        continue;
      }
      try {
        const sent = await this.deliver(sub.endpoint, payload, {
          p256dh: sub.p256dh,
          auth: sub.auth,
        });
        if (sent) {
          result.delivered += 1;
          await this.prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() },
          });
        } else {
          result.failed += 1;
        }
      } catch {
        result.failed += 1;
      }
    }
    return result;
  }

  async sendToOrganization(organizationId: string, payload: PushPayload) {
    const subs = await this.prisma.pushSubscription.findMany({
      where: { organizationId },
      take: 500,
    });
    const result = { attempted: subs.length, delivered: 0, failed: 0, removed: 0 };
    for (const sub of subs) {
      try {
        const sent = await this.deliver(sub.endpoint, payload, {
          p256dh: sub.p256dh,
          auth: sub.auth,
        });
        if (sent) result.delivered += 1;
        else result.failed += 1;
      } catch {
        result.failed += 1;
      }
    }
    return result;
  }

  private async deliver(
    endpoint: string,
    payload: PushPayload,
    keys: { p256dh: string; auth: string },
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      // Without VAPID we cannot actually deliver to a push service; mark as best-effort.
      return false;
    }
    try {
      const safeEndpoint = this.validateEndpoint(endpoint);
      const body = JSON.stringify({
        title: payload.title,
        body: payload.body ?? "",
        url: payload.url,
        icon: payload.icon ?? "/icons/icon-192.svg",
        data: payload.data ?? {},
      });
      const res = await fetch(safeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "TTL": "60",
        },
        body,
      });
      return res.status === 201 || res.status === 200;
    } catch {
      return false;
    }
  }

  private validateEndpoint(endpoint: string) {
    let parsed: URL;
    try {
      parsed = new URL(endpoint);
    } catch {
      throw new BadRequestException("Push endpoint must be a valid absolute URL");
    }

    if (parsed.protocol !== "https:") {
      throw new BadRequestException("Push endpoint must use HTTPS");
    }
    if (parsed.username || parsed.password) {
      throw new BadRequestException("Push endpoint must not include credentials");
    }

    const hostname = parsed.hostname.toLowerCase();
    const allowedHosts = this.allowedHosts();
    if (allowedHosts.length > 0) {
      if (!allowedHosts.includes(hostname)) {
        throw new BadRequestException("Push endpoint host is not allowlisted");
      }
      return parsed.toString();
    }

    if (this.isPrivateHostname(hostname)) {
      throw new BadRequestException("Push endpoint must use a public host");
    }

    return parsed.toString();
  }

  private isPrivateHostname(hostname: string) {
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local")
    ) {
      return true;
    }

    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const [first = -1, second = -1] = hostname.split(".").map(Number);
      return (
        first === 0 ||
        first === 10 ||
        first === 127 ||
        (first === 169 && second === 254) ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168)
      );
    }

    const normalized = hostname.replace(/^\[|\]$/g, "");
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  // Best-effort VAPID JWT generation for the public key advertisement endpoint.
  buildVapidInfo() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        publicKey: null,
        subject: this.vapidSubject,
      };
    }
    return {
      configured: true,
      publicKey: this.vapidPublicKey,
      subject: this.vapidSubject,
      // private key is intentionally never returned
    };
  }
}
