import { Inject, Injectable, Logger } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "./redis.constants";

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.client.get(key);
      if (!val) return null;
      return JSON.parse(val) as T;
    } catch (err) {
      this.logger.warn(`Redis get failed for key ${key}: ${String(err)}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, serialized, "EX", ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      this.logger.warn(`Redis set failed for key ${key}: ${String(err)}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Redis del failed for key ${key}: ${String(err)}`);
    }
  }

  async publish(channel: string, message: unknown): Promise<void> {
    try {
      await this.client.publish(channel, JSON.stringify(message));
    } catch (err) {
      this.logger.warn(`Redis publish failed on channel ${channel}: ${String(err)}`);
    }
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  getClient(): Redis {
    return this.client;
  }
}
