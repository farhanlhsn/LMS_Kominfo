import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

// Dynamic import to avoid TypeScript/webpack path resolution issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PrismaClient: any;
try {
  // Try workspace package first
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const mod = require('@lms/database');
  PrismaClient = mod.Prisma?.PrismaClient || mod.PrismaClient;
} catch {
  // Fallback: direct require from generated client
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const mod = require('../../../../packages/database/generated/client');
  PrismaClient = mod.PrismaClient;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client: any;

  constructor() {
    this.client = new PrismaClient();
  }

  // Proxy all property access to the underlying PrismaClient
  get user() { return this.client.user; }
  get course() { return this.client.course; }
  get module() { return this.client.module; }
  get lesson() { return this.client.lesson; }
  get lessonContent() { return this.client.lessonContent; }
  get material() { return this.client.material; }
  get region() { return this.client.region; }
  get enrollment() { return this.client.enrollment; }
  get progress() { return this.client.progress; }
  get quiz() { return this.client.quiz; }
  get question() { return this.client.question; }
  get choice() { return this.client.choice; }
  get quizAttempt() { return this.client.quizAttempt; }
  get quizAnswer() { return this.client.quizAnswer; }
  get assignment() { return this.client.assignment; }
  get submission() { return this.client.submission; }
  get certificate() { return this.client.certificate; }
  get badge() { return this.client.badge; }
  get userBadge() { return this.client.userBadge; }
  get leaderboard() { return this.client.leaderboard; }
  get chatSession() { return this.client.chatSession; }
  get chatMessage() { return this.client.chatMessage; }
  get embedding() { return this.client.embedding; }
  get activity() { return this.client.activity; }
  get notification() { return this.client.notification; }
  get analyticsEvent() { return this.client.analyticsEvent; }
  get systemSetting() { return this.client.systemSetting; }
  get aiUsage() { return this.client.aiUsage; }

  /**
   * Forward $transaction ke underlying PrismaClient. Karena prisma client
   * dibungkus dengan `any` untuk menghindari dependensi siklik Prisma types,
   * kita expose method ini secara eksplisit.
   */
  $transaction<T>(
    fn: (tx: any) => Promise<T>,
    options?: { maxWait?: number; timeout?: number; isolationLevel?: any },
  ): Promise<T>;
  $transaction<T extends any[]>(
    operations: [...T],
    options?: { maxWait?: number; timeout?: number; isolationLevel?: any },
  ): Promise<{ [K in keyof T]: any }>;
  $transaction(arg: any, options?: any): Promise<any> {
    return this.client.$transaction(arg, options);
  }

  /**
   * Forward $queryRaw ke underlying PrismaClient (untuk raw SQL queries).
   * Mendukung template literal: `prisma.$queryRaw\`SELECT 1\``
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | any, ...values: any[]): Promise<T> {
    return this.client.$queryRaw(query, ...values);
  }

  async onModuleInit() {
    await this.client.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
    this.logger.log('Disconnected from database');
  }
}
