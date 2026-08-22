/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProgramsService } from './programs.service';

describe('ProgramsService', () => {
  const program = {
    id: 'cm1abcdefghijklmno1234567',
    slug: 'flagship-mentorship',
    title: 'Flagship Mentorship',
    description: 'A mentoring programme.',
    objectives: null,
    audience: null,
    impact: null,
    ctaLabel: null,
    ctaUrl: null,
    heroImageId: null,
    heroImage: null,
    galleryMedia: [],
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let prisma: any;
  let audit: { record: jest.Mock };
  let service: ProgramsService;

  beforeEach(() => {
    prisma = {
      program: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      media: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ProgramsService(prisma, audit as any);
  });

  it('creates a draft and records an audit event for an authorized actor', async () => {
    prisma.program.create.mockResolvedValue(program);

    await expect(
      service.create(
        {
          slug: program.slug,
          title: program.title,
          description: program.description,
        },
        'actor-1',
        '127.0.0.1',
      ),
    ).resolves.toEqual(program);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CONTENT_CREATED',
        entityType: 'Program',
        entityId: program.id,
        actorId: 'actor-1',
      }),
    );
  });

  it('rejects an invalid media reference before writing', async () => {
    prisma.media.findMany.mockResolvedValue([]);

    await expect(
      service.create(
        {
          slug: program.slug,
          title: program.title,
          description: program.description,
          heroImageId: 'cm1abcdefghijklmno1234567',
        },
        'actor-1',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.program.create).not.toHaveBeenCalled();
  });

  it('maps a duplicate slug to conflict', async () => {
    prisma.program.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.1.0',
      }),
    );

    await expect(
      service.create(
        {
          slug: program.slug,
          title: program.title,
          description: program.description,
        },
        'actor-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('updates an existing program and records before/after metadata', async () => {
    prisma.program.findUnique.mockResolvedValue(program);
    prisma.program.update.mockResolvedValue({ ...program, title: 'Updated' });

    await expect(
      service.update(program.id, { title: 'Updated' }, 'actor-1'),
    ).resolves.toMatchObject({ title: 'Updated' });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CONTENT_UPDATED',
        entityId: program.id,
      }),
    );
  });

  it('publishes and unpublishes using the persisted publication field', async () => {
    prisma.program.findUnique.mockResolvedValue(program);
    prisma.program.update
      .mockResolvedValueOnce({ ...program, isPublished: true })
      .mockResolvedValueOnce({ ...program, isPublished: false });

    await expect(
      service.setPublished(program.id, true, 'actor-1'),
    ).resolves.toMatchObject({
      isPublished: true,
    });
    await expect(
      service.setPublished(program.id, false, 'actor-1'),
    ).resolves.toMatchObject({
      isPublished: false,
    });
    expect(audit.record).toHaveBeenCalledTimes(2);
  });

  it('throws not found for an absent admin record', async () => {
    prisma.program.findUnique.mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
  });

  it('deletes only after loading the record and records the deletion', async () => {
    prisma.program.findUnique.mockResolvedValue(program);
    prisma.program.delete.mockResolvedValue(program);

    await expect(
      service.remove(program.id, 'actor-1'),
    ).resolves.toBeUndefined();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CONTENT_DELETED',
        entityId: program.id,
      }),
    );
  });
});
