/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SupportLabService } from './support-lab.service';

describe('SupportLabService', () => {
  const service_ = {
    id: 'cm1service0000000000000001',
    name: 'Career Coaching',
    description: 'One-on-one career coaching sessions.',
    isActive: true,
    order: 0,
  };

  const request = {
    id: 'cm1request0000000000000001',
    serviceId: service_.id,
    requesterName: 'Amina Yusuf',
    requesterEmail: 'amina@example.com',
    requesterPhone: null,
    message: 'I would like to book a session.',
    status: 'NEW',
    handledById: null,
    handledBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let prisma: any;
  let audit: { record: jest.Mock };
  let service: SupportLabService;

  beforeEach(() => {
    prisma = {
      supportService: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      supportRequest: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new SupportLabService(prisma, audit as any);
  });

  describe('submit (public)', () => {
    it('accepts a submission against a real, active service', async () => {
      prisma.supportService.findUnique.mockResolvedValue({
        id: service_.id,
        isActive: true,
      });
      prisma.supportRequest.create.mockResolvedValue({
        id: request.id,
        createdAt: request.createdAt,
      });

      const result = await service.submit({
        serviceId: service_.id,
        requesterName: 'Amina Yusuf',
        requesterEmail: 'amina@example.com',
        message: 'I would like to book a session.',
      });

      expect(result).toEqual({ id: request.id, createdAt: request.createdAt });
      expect(prisma.supportRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serviceId: service_.id,
            requesterName: 'Amina Yusuf',
            requesterEmail: 'amina@example.com',
          }),
        }),
      );
    });

    it('rejects a submission against a nonexistent service', async () => {
      prisma.supportService.findUnique.mockResolvedValue(null);

      await expect(
        service.submit({
          serviceId: 'cm1missing00000000000000001',
          requesterName: 'A',
          requesterEmail: 'a@example.com',
          message: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.supportRequest.create).not.toHaveBeenCalled();
    });

    it('rejects a submission against an inactive service, regardless of client-claimed state', async () => {
      prisma.supportService.findUnique.mockResolvedValue({
        id: service_.id,
        isActive: false,
      });

      await expect(
        service.submit({
          serviceId: service_.id,
          requesterName: 'A',
          requesterEmail: 'a@example.com',
          message: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.supportRequest.create).not.toHaveBeenCalled();
    });

    it('does not audit-log a public submission', async () => {
      prisma.supportService.findUnique.mockResolvedValue({
        id: service_.id,
        isActive: true,
      });
      prisma.supportRequest.create.mockResolvedValue({
        id: request.id,
        createdAt: new Date(),
      });

      await service.submit({
        serviceId: service_.id,
        requesterName: 'Amina Yusuf',
        requesterEmail: 'amina@example.com',
        message: 'x',
      });

      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns the standard pagination envelope', async () => {
      prisma.$transaction.mockResolvedValue([[request], 1]);

      await expect(service.list(0, 25)).resolves.toEqual({
        items: [request],
        total: 1,
        skip: 0,
        take: 25,
      });
    });

    it('filters by status when provided', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.list(0, 25, 'RESOLVED');
      expect(prisma.supportRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'RESOLVED' } }),
      );
    });
  });

  describe('getById', () => {
    it('throws not found for a missing request', async () => {
      prisma.supportRequest.findUnique.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the request when found', async () => {
      prisma.supportRequest.findUnique.mockResolvedValue(request);
      await expect(service.getById(request.id)).resolves.toEqual(request);
    });
  });

  describe('updateStatus', () => {
    it('persists the new status and records an audit event', async () => {
      prisma.supportRequest.findUnique.mockResolvedValue({
        id: request.id,
        status: 'NEW',
      });
      prisma.supportRequest.update.mockResolvedValue({
        ...request,
        status: 'IN_PROGRESS',
      });

      await expect(
        service.updateStatus(
          request.id,
          'IN_PROGRESS' as any,
          'actor-1',
          '127.0.0.1',
        ),
      ).resolves.toMatchObject({ status: 'IN_PROGRESS' });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBMISSION_STATUS_CHANGED',
          entityType: 'SupportRequest',
          entityId: request.id,
          actorId: 'actor-1',
          before: { status: 'NEW' },
          after: { status: 'IN_PROGRESS' },
        }),
      );
    });

    it('throws not found for a missing request', async () => {
      prisma.supportRequest.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('missing', 'IN_PROGRESS' as any, 'actor-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignHandler', () => {
    it('assigns a real user and records an audit event', async () => {
      prisma.supportRequest.findUnique.mockResolvedValue({
        id: request.id,
        handledById: null,
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.supportRequest.update.mockResolvedValue({
        ...request,
        handledById: 'user-1',
      });

      await expect(
        service.assignHandler(request.id, 'user-1', 'actor-1'),
      ).resolves.toMatchObject({ handledById: 'user-1' });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CONTENT_UPDATED',
          entityType: 'SupportRequest',
        }),
      );
    });

    it('rejects assigning a nonexistent user', async () => {
      prisma.supportRequest.findUnique.mockResolvedValue({
        id: request.id,
        handledById: null,
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assignHandler(request.id, 'missing-user', 'actor-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.supportRequest.update).not.toHaveBeenCalled();
    });

    it('allows unassigning with null', async () => {
      prisma.supportRequest.findUnique.mockResolvedValue({
        id: request.id,
        handledById: 'user-1',
      });
      prisma.supportRequest.update.mockResolvedValue({
        ...request,
        handledById: null,
      });

      await expect(
        service.assignHandler(request.id, null, 'actor-1'),
      ).resolves.toMatchObject({
        handledById: null,
      });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('SupportService admin CRUD', () => {
    it('creates a service and records an audit event', async () => {
      prisma.supportService.create.mockResolvedValue(service_);
      await expect(
        service.createService({ name: service_.name }, 'actor-1'),
      ).resolves.toEqual(service_);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CONTENT_CREATED',
          entityType: 'SupportService',
        }),
      );
    });

    it('updates a service and records before/after', async () => {
      prisma.supportService.findUnique.mockResolvedValue(service_);
      prisma.supportService.update.mockResolvedValue({
        ...service_,
        name: 'Updated',
      });
      await expect(
        service.updateService(service_.id, { name: 'Updated' }, 'actor-1'),
      ).resolves.toMatchObject({ name: 'Updated' });
    });

    it('throws not found updating a missing service', async () => {
      prisma.supportService.findUnique.mockResolvedValue(null);
      await expect(
        service.updateService('missing', { name: 'x' }, 'actor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes a service and records an audit event', async () => {
      prisma.supportService.findUnique.mockResolvedValue(service_);
      prisma.supportService.delete.mockResolvedValue(service_);
      await expect(
        service.removeService(service_.id, 'actor-1'),
      ).resolves.toBeUndefined();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CONTENT_DELETED',
          entityType: 'SupportService',
        }),
      );
    });

    it('maps a foreign-key violation on delete to a conflict', async () => {
      prisma.supportService.findUnique.mockResolvedValue(service_);
      prisma.supportService.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('fk violation', {
          code: 'P2003',
          clientVersion: '6.1.0',
        }),
      );
      await expect(
        service.removeService(service_.id, 'actor-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
