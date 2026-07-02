import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService, NotificationType } from './notifications.service';
import { PrismaService } from '@/prisma/prisma.service';

const mockPrismaService = {
  notification: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('harus membuat notifikasi dengan type INFO sebagai default', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'n1', userId: 'u1', title: 'T', body: 'B' });

      await service.create({ userId: 'u1', title: 'T', body: 'B' });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u1', title: 'T', body: 'B' }),
      });
    });

    it('harus menghormati type yang diberikan', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'n1' });

      await service.create({ userId: 'u1', title: 'T', body: 'B', type: 'WARNING' as NotificationType });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'WARNING' }),
      });
    });
  });

  describe('broadcastToUsers', () => {
    it('harus return count=0 jika userIds kosong', async () => {
      const result = await service.broadcastToUsers([], { title: 'T', body: 'B' });
      expect(result).toEqual({ count: 0 });
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('harus insert many saat broadcast', async () => {
      prisma.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await service.broadcastToUsers(['u1', 'u2', 'u3'], {
        title: 'Pengumuman',
        body: 'Libur nasional',
        type: 'INFO',
      });

      expect(result.count).toBe(3);
      expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('broadcastToRegion', () => {
    it('harus mengambil user aktif di region lalu broadcast', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      prisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await service.broadcastToRegion('reg-1', { title: 'T', body: 'B' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ regionId: 'reg-1' }) }),
      );
      expect(result.count).toBe(2);
    });
  });

  describe('list', () => {
    it('harus filter unreadOnly jika opsi diaktifkan', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.list('u1', { unreadOnly: true, limit: 5 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', isRead: false },
          take: 5,
        }),
      );
    });
  });

  describe('unreadCount', () => {
    it('harus menghitung notifikasi yang belum dibaca', async () => {
      prisma.notification.count.mockResolvedValue(7);

      const count = await service.unreadCount('u1');

      expect(count).toBe(7);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'u1', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('harus return null jika notifikasi milik user lain', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u2' });

      const result = await service.markAsRead('n1', 'u1');

      expect(result).toBeNull();
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('harus update jika notifikasi milik user tersebut', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1' });
      prisma.notification.update.mockResolvedValue({ id: 'n1', isRead: true });

      const result = await service.markAsRead('n1', 'u1');

      expect(result).toEqual({ id: 'n1', isRead: true });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { isRead: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('harus update semua unread ke read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('u1');

      expect(result).toEqual({ count: 5 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('remove', () => {
    it('harus return null jika notifikasi bukan milik user', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u2' });

      const result = await service.remove('n1', 'u1');

      expect(result).toBeNull();
      expect(prisma.notification.delete).not.toHaveBeenCalled();
    });

    it('harus hapus notifikasi milik user', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1' });
      prisma.notification.delete.mockResolvedValue({ id: 'n1' });

      const result = await service.remove('n1', 'u1');

      expect(result).toEqual({ success: true });
      expect(prisma.notification.delete).toHaveBeenCalledWith({ where: { id: 'n1' } });
    });
  });
});
