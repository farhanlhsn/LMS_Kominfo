import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * CacheService — wrapper tipis di atas ioredis untuk caching response endpoint
 * yang sering diakses (regions, courses list, leaderboard).
 *
 * Design:
 * - Lazy connect: tidak connect sampai method pertama dipanggil
 * - Fallback ke "no-op" jika Redis tidak tersedia (env tidak di-set)
 * - TTL default 60 detik, bisa di-override per-key
 * - Tag-based invalidation: bisa invalidate semua key dengan prefix tertentu
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.enabled = (this.config.get<string>('REDIS_ENABLED') || 'true') === 'true';
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Cache disabled (REDIS_ENABLED=false)');
      return;
    }
    try {
      this.client = new Redis({
        host: this.config.get<string>('REDIS_HOST') || 'localhost',
        port: parseInt(this.config.get<string>('REDIS_PORT') || '6379', 10),
        password: this.config.get<string>('REDIS_PASSWORD') || undefined,
        db: parseInt(this.config.get<string>('REDIS_DB') || '0', 10),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      await this.client.connect();
      this.logger.log('Redis cache connected');
    } catch (err) {
      this.logger.warn(`Redis unavailable, cache disabled: ${(err as Error).message}`);
      this.client = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  /**
   * Mengambil value cache. Mengembalikan null jika cache miss atau Redis tidak tersedia.
   * Otomatis handle JSON parse error (anggap cache miss).
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;
    try {
      const raw = await this.client!.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Cache get error for ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Menyimpan value ke cache dengan TTL (detik). Default 60 detik.
   * Otomatis handle JSON serialization.
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      const payload = JSON.stringify(value);
      await this.client!.set(key, payload, 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set error for ${key}: ${(err as Error).message}`);
    }
  }

  /**
   * Hapus 1 key dari cache.
   */
  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.del(key);
    } catch (err) {
      this.logger.warn(`Cache del error for ${key}: ${(err as Error).message}`);
    }
  }

  /**
   * Hapus semua key dengan prefix tertentu. Cocok untuk invalidasi cache
   * setelah mutasi (misal create/update/delete region → invalidate prefix "regions:").
   */
  async invalidatePrefix(prefix: string): Promise<number> {
    if (!this.isAvailable()) return 0;
    try {
      const stream = this.client!.scanStream({ match: `${prefix}*`, count: 100 });
      const keys: string[] = [];
      for await (const batch of stream) {
        keys.push(...(batch as string[]));
      }
      if (keys.length === 0) return 0;
      await this.client!.del(...keys);
      return keys.length;
    } catch (err) {
      this.logger.warn(`Cache invalidate error for ${prefix}: ${(err as Error).message}`);
      return 0;
    }
  }

  /**
   * Cache-aside helper. Mengambil dari cache, jika miss maka panggil loader,
   * simpan hasilnya ke cache, dan kembalikan.
   *
   * @param key Cache key
   * @param ttl TTL dalam detik
   * @param loader Fungsi async yang memuat data dari source (DB, dll)
   */
  async wrap<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await loader();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  /**
   * Health check apakah Redis terhubung.
   */
  async ping(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const reply = await this.client!.ping();
      return reply === 'PONG';
    } catch {
      return false;
    }
  }
}
