import { Test, TestingModule } from '@nestjs/testing';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  enrollment: {
    findUnique: jest.fn(),
  },
  certificate: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockPdfService = {
  generate: jest.fn().mockResolvedValue({ publicUrl: '/uploads/cert.pdf' }),
};

const mockNotificationsService = {
  create: jest.fn().mockResolvedValue({ id: 'n1' }),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('https://lms.kominfo.go.id'),
};

describe('CertificatesService', () => {
  let service: CertificatesService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CertificatePdfService, useValue: mockPdfService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCertificate', () => {
    it('should throw NotFoundException if not enrolled or not completed', async () => {
      prisma.enrollment.findUnique.mockResolvedValue(null);
      await expect(service.generateCertificate('u1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('should return existing certificate if already generated', async () => {
      prisma.enrollment.findUnique.mockResolvedValue({ id: 'e1', status: 'COMPLETED' });
      prisma.certificate.findUnique.mockResolvedValue({ id: 'cert-1', certificateNumber: 'KMNFO-1' });

      const res = await service.generateCertificate('u1', 'c1');
      expect(res.id).toBe('cert-1');
      expect(prisma.certificate.create).not.toHaveBeenCalled();
    });

    it('should generate new certificate successfully', async () => {
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'e1',
        status: 'COMPLETED',
        user: { id: 'u1', name: 'Test User' },
        course: {
          id: 'c1',
          title: 'Test Course',
          region: { name: 'DKI Jakarta' },
        },
      });
      prisma.certificate.findUnique.mockResolvedValue(null);
      prisma.certificate.create.mockResolvedValue({ id: 'cert-new', certificateNumber: 'KMNFO-NEW' });

      const res = await service.generateCertificate('u1', 'c1');
      expect(res.id).toBe('cert-new');
      expect(prisma.certificate.create).toHaveBeenCalled();
    });
  });

  describe('verifyCertificate', () => {
    it('should throw NotFoundException if certificate number not found', async () => {
      prisma.certificate.findUnique.mockResolvedValue(null);
      await expect(service.verifyCertificate('fake-no')).rejects.toThrow(NotFoundException);
    });

    it('should return certificate details if valid', async () => {
      prisma.certificate.findUnique.mockResolvedValue({ id: 'cert-1', certificateNumber: 'valid-no' });
      const res = await service.verifyCertificate('valid-no');
      expect(res.certificateNumber).toBe('valid-no');
    });
  });
});
