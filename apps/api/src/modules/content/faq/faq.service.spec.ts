/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { NotFoundException } from '@nestjs/common';
import { FaqService } from './faq.service';

// Regression test: ADMIN_SELECT previously included `isPublished`, a field
// that doesn't exist on the FAQ Prisma model — every admin FAQ operation
// (listAdmin/getById/create/update, all of which select ADMIN_SELECT) would
// throw a Prisma "Unknown field" error at runtime. These tests assert the
// select shape actually sent to Prisma never references it.
describe('FaqService', () => {
  const faq = {
    id: 'cm1abcdefghijklmno1234567',
    question: 'Question?',
    answer: 'Answer.',
    category: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let prisma: any;
  let audit: { record: jest.Mock };
  let service: FaqService;

  beforeEach(() => {
    prisma = {
      fAQ: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new FaqService(prisma, audit as any);
  });

  function selectFieldsOf(mockFn: jest.Mock): string[] {
    const call = mockFn.mock.calls[0][0] as { select: Record<string, unknown> };
    return Object.keys(call.select);
  }

  it('listAdmin selects a shape with no isPublished field', async () => {
    prisma.$transaction.mockResolvedValue([[faq], 1]);

    await service.listAdmin(0, 25);

    expect(selectFieldsOf(prisma.fAQ.findMany)).not.toContain('isPublished');
  });

  it('getById selects a shape with no isPublished field', async () => {
    prisma.fAQ.findUnique.mockResolvedValue(faq);

    await service.getById(faq.id);

    expect(selectFieldsOf(prisma.fAQ.findUnique)).not.toContain('isPublished');
  });

  it('getById throws NotFoundException for a missing record', async () => {
    prisma.fAQ.findUnique.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
  });

  it('create selects a shape with no isPublished field and records an audit event', async () => {
    prisma.fAQ.create.mockResolvedValue(faq);

    const result = await service.create(
      { question: faq.question, answer: faq.answer },
      'actor-1',
      '127.0.0.1',
    );

    expect(result).toEqual(faq);
    expect(selectFieldsOf(prisma.fAQ.create)).not.toContain('isPublished');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CONTENT_CREATED', entityId: faq.id }),
    );
  });

  it('update selects a shape with no isPublished field', async () => {
    prisma.fAQ.findUnique.mockResolvedValue(faq);
    prisma.fAQ.update.mockResolvedValue({ ...faq, question: 'Updated?' });

    await service.update(faq.id, { question: 'Updated?' }, 'actor-1');

    expect(selectFieldsOf(prisma.fAQ.update)).not.toContain('isPublished');
  });
});
