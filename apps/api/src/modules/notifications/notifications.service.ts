import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
}

/**
 * Notifications service.
 *
 * Dipakai oleh modul lain via dependency injection (mis. CertificatesService
 * kirim notif saat sertifikat diterbitkan, CoursesService saat ada kursus baru,
 * AnalyticsService saat milestone tercapai, dll).
 *
 * Frontend melakukan polling ke endpoint untuk badge count (saat ini setiap
 * 60 detik) — akan diganti WebSocket adapter di Fase 4.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Buat satu notifikasi untuk user tertentu.
   */
  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type as any,
      },
    });
  }

  /**
   * Broadcast ke banyak user (mis. semua student di region Aceh).
   */
  async broadcastToUsers(userIds: string[], payload: Omit<CreateNotificationInput, 'userId'>) {
    if (userIds.length === 0) return { count: 0 };
    const data = userIds.map((userId) => ({
      userId,
      title: payload.title,
      body: payload.body,
      type: (payload.type || 'INFO') as any,
    }));
    const result = await this.prisma.notification.createMany({ data });
    this.logger.log(`Broadcast ke ${userIds.length} user: ${payload.title}`);
    return { count: result.count };
  }

  /**
   * Broadcast ke semua user di region tertentu.
   */
  async broadcastToRegion(regionId: string, payload: Omit<CreateNotificationInput, 'userId'>) {
    const users = await this.prisma.user.findMany({
      where: { regionId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    return this.broadcastToUsers(users.map((u) => u.id), payload);
  }

  /**
   * List notifikasi user saat ini.
   */
  async list(userId: string, opts: { unreadOnly?: boolean; limit?: number; cursor?: string } = {}) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(opts.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts.limit || 20,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
    });
  }

  /**
   * Badge count unread (untuk UI bell).
   */
  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  /**
   * Tandai notifikasi tertentu sudah dibaca.
   */
  async markAsRead(id: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) {
      return null;
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Tandai semua notifikasi user sudah dibaca.
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { count: result.count };
  }

  /**
   * Hapus notifikasi (soft - hard delete untuk sekarang).
   */
  async remove(id: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) return null;
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }
}
