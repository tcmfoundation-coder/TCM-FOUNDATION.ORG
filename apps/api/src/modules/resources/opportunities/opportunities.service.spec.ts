/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OpportunitiesService } from './opportunities.service';

describe('OpportunitiesService', () => {
  const opportunity = {
    id: 'cm1abcdefghijklmno1234567',
    slug: 'chevening-2027',
    title: 'Chevening Scholarship 2027',
    description: 'Fully funded postgraduate study in the UK.',
    type: 'EDUCATION',
    deadline: new Date('2027-11-01T00:00:00.000Z'),
    externalApplyUrl: 'https://example.org/apply',
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let prisma: any;
  let audit: { record: jest.Mock };
  let service: OpportunitiesService;

  beforeEach(() => {
    prisma = {
      opportunity: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new OpportunitiesService(prisma, audit as any);
  });

  describe('list (public)', () => {
    it('only returns published opportunities', async () => {
      prisma.$transaction.mockResolvedValue([[opportunity], 1]);
      await service.list();
      const findManyArgs = prisma.opportunity.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({ isPublished: true });
    });

    it('adds the type filter when one is supplied', async () => {
      prisma.$transaction.mockResolvedValue([[opportunity], 1]);
      await service.list('EDUCATION');
      const findManyArgs = prisma.opportunity.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({
        isPublished: true,
        type: 'EDUCATION',
      });
    });

    it('never exposes isPublished through the public shape', async () => {
      prisma.$transaction.mockResolvedValue([[opportunity], 1]);
      await service.list();
      const findManyArgs = prisma.opportunity.findMany.mock.calls[0][0];
      expect(findManyArgs.select.isPublished).toBeUndefined();
    });
  });

  describe('listAdmin', () => {
    it('returns drafts as well as published entries', async () => {
      prisma.$transaction.mockResolvedValue([[opportunity], 1]);
      await service.listAdmin(0, 25);
      const findManyArgs = prisma.opportunity.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toEqual({});
      expect(findManyArgs.select.isPublished).toBe(true);
    });
  });

  describe('create', () => {
    it('persists the opportunity and records an audit entry', async () => {
      prisma.opportunity.create.mockResolvedValue(opportunity);

      const result = await service.create(
        {
          slug: 'chevening-2027',
          title: 'Chevening Scholarship 2027',
          description: 'Fully funded postgraduate study in the UK.',
          type: 'EDUCATION',
          deadline: '2027-11-01T00:00:00.000Z',
          externalApplyUrl: 'https://example.org/apply',
        },
        'actor-1',
        '127.0.0.1',
      );

      expect(result).toEqual(opportunity);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CONTENT_CREATED',
          entityType: 'Opportunity',
          actorId: 'actor-1',
        }),
      );
    });

    it('stores a null deadline when none is supplied', async () => {
      prisma.opportunity.create.mockResolvedValue(opportunity);
      await service.create(
        {
          slug: 'no-deadline',
          title: 'Rolling opportunity',
          description: 'Applications accepted year round.',
          type: 'CAREER',
          externalApplyUrl: 'https://example.org/apply',
        },
        'actor-1',
      );
      expect(
        prisma.opportunity.create.mock.calls[0][0].data.deadline,
      ).toBeNull();
    });

    it('translates a duplicate slug into a ConflictException', async () => {
      prisma.opportunity.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.create(
          {
            slug: 'chevening-2027',
            title: 'Duplicate',
            description: 'Duplicate slug.',
            type: 'EDUCATION' as any,
            externalApplyUrl: 'https://example.org/apply',
          },
          'actor-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('leaves the deadline untouched when the key is omitted', async () => {
      prisma.opportunity.findUnique.mockResolvedValue(opportunity);
      prisma.opportunity.update.mockResolvedValue(opportunity);

      await service.update('id-1', { title: 'Renamed' }, 'actor-1');

      const data = prisma.opportunity.update.mock.calls[0][0].data;
      expect('deadline' in data).toBe(false);
    });

    it('clears the deadline when an empty value is sent', async () => {
      prisma.opportunity.findUnique.mockResolvedValue(opportunity);
      prisma.opportunity.update.mockResolvedValue(opportunity);

      await service.update('id-1', { deadline: '' }, 'actor-1');

      expect(
        prisma.opportunity.update.mock.calls[0][0].data.deadline,
      ).toBeNull();
    });

    it('throws NotFoundException for an unknown id', async () => {
      prisma.opportunity.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', { title: 'x' }, 'actor-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('setPublished', () => {
    it('updates the flag and records the change', async () => {
      prisma.opportunity.findUnique.mockResolvedValue(opportunity);
      prisma.opportunity.update.mockResolvedValue({
        ...opportunity,
        isPublished: false,
      });

      await service.setPublished('id-1', false, 'actor-1');

      expect(prisma.opportunity.update.mock.calls[0][0].data).toEqual({
        isPublished: false,
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CONTENT_UPDATED',
          entityType: 'Opportunity',
        }),
      );
    });
  });

  describe('remove', () => {
    it('deletes the row and records the prior state', async () => {
      prisma.opportunity.findUnique.mockResolvedValue(opportunity);
      prisma.opportunity.delete.mockResolvedValue(opportunity);

      await service.remove('id-1', 'actor-1');

      expect(prisma.opportunity.delete).toHaveBeenCalledWith({
        where: { id: 'id-1' },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CONTENT_DELETED',
          entityType: 'Opportunity',
          before: expect.objectContaining({ slug: 'chevening-2027' }),
        }),
      );
    });

    it('does not delete when the opportunity does not exist', async () => {
      prisma.opportunity.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', 'actor-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.opportunity.delete).not.toHaveBeenCalled();
    });
  });
});
