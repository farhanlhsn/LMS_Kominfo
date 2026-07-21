import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import type { INestApplication } from "@nestjs/common";
import type { ServerOptions } from "socket.io";
import Redis from "ioredis";

/**
 * Socket.IO adapter with optional Redis pub/sub for multi-node rooms.
 * Falls back to in-memory adapter if REDIS_URL is missing or connect fails.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(private readonly app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL;
    if (!url) return;

    try {
      const pub = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      const sub = pub.duplicate();
      await Promise.all([pub.connect(), sub.connect()]);
      this.adapterConstructor = createAdapter(pub, sub);
    } catch {
      this.adapterConstructor = null;
    }
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
