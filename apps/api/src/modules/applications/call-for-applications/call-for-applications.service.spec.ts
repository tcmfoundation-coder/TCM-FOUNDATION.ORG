/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CallForApplicationsService } from './call-for-applications.service';

describe('CallForApplicationsService — application submissions', () => {
  const call = {
    id: 'cm1call0000000000000000001',
    slug: 'women-in-tech-2026',
    status: 'OPEN',
  };

  const shortTextField = {
    id: 'cm1field000000000000000001',
    label: 'Full name',
    fieldType: 'SHORT_TEXT',
    isRequired: true,
    options: null,
    order: 0,
  };

  const emailField = {
    id: 'cm1field000000000000000002',
    label: 'Email',
    fieldType: 'EMAIL',
    isRequired: true,
    options: null,
    order: 1,
  };

  const optionalPhoneField = {
    id: 'cm1field000000000000000003',
    label: 'Phone',
    fieldType: 'PHONE',
    isRequired: false,
    options: null,
    order: 2,
  };

  const singleSelectField = {
    id: 'cm1field000000000000000004',
    label: 'Track',
    fieldType: 'SINGLE_SELECT',
    isRequired: true,
    options: ['Business', 'Career'],
    order: 3,
  };

  const validAnswers = {
    [shortTextField.id]: 'Amina Yusuf',
    [emailField.id]: 'amina@example.com',
    [singleSelectField.id]: 'Business',
  };

  let prisma: any;
  let audit: { record: jest.Mock };
  let service: CallForApplicationsService;

  beforeEach(() => {
    prisma = {
      callForApplication: { findUnique: jest.fn() },
      applicationField: { findMany: jest.fn() },
      applicationSubmission: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new CallForApplicationsService(prisma, audit as any);
  });

  describe('submitApplication', () => {
    function mockCampaign(
      overrides: Partial<typeof call> = {},
      fields = [
        shortTextField,
        emailField,
        optionalPhoneField,
        singleSelectField,
      ],
    ) {
      prisma.callForApplication.findUnique.mockResolvedValue({
        ...call,
        ...overrides,
        fields,
      });
    }

    it('accepts a valid submission and persists it against the real campaign fields', async () => {
      mockCampaign();
      prisma.applicationSubmission.create.mockResolvedValue({
        id: 'cm1sub00000000000000000001',
        submittedAt: new Date('2026-08-19T00:00:00Z'),
      });

      const result = await service.submitApplication(call.slug, {
        applicantName: 'Amina Yusuf',
        applicantEmail: 'amina@example.com',
        consentedToContact: true,
        answers: validAnswers,
      });

      expect(result).toEqual({
        id: 'cm1sub00000000000000000001',
        submittedAt: new Date('2026-08-19T00:00:00Z'),
      });
      expect(prisma.applicationSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            callForApplicationId: call.id,
            applicantName: 'Amina Yusuf',
            applicantEmail: 'amina@example.com',
            answers: validAnswers,
          }),
        }),
      );
    });

    it('rejects a submission against a nonexistent campaign', async () => {
      prisma.callForApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.submitApplication('does-not-exist', {
          applicantName: 'A',
          applicantEmail: 'a@example.com',
          consentedToContact: true,
          answers: {},
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.applicationSubmission.create).not.toHaveBeenCalled();
    });

    it('rejects a submission against a campaign that is not OPEN, regardless of client-claimed state', async () => {
      mockCampaign({ status: 'DRAFT' });

      await expect(
        service.submitApplication(call.slug, {
          applicantName: 'A',
          applicantEmail: 'a@example.com',
          consentedToContact: true,
          answers: validAnswers,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.applicationSubmission.create).not.toHaveBeenCalled();
    });

    it('rejects a submission missing a required field', async () => {
      mockCampaign();

      await expect(
        service.submitApplication(call.slug, {
          applicantName: 'Amina Yusuf',
          applicantEmail: 'amina@example.com',
          consentedToContact: true,
          answers: {
            [shortTextField.id]: 'Amina Yusuf',
            // emailField and singleSelectField (both required) omitted
          },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.applicationSubmission.create).not.toHaveBeenCalled();
    });

    it('rejects a submission that references a field id not on the campaign', async () => {
      mockCampaign();

      await expect(
        service.submitApplication(call.slug, {
          applicantName: 'Amina Yusuf',
          applicantEmail: 'amina@example.com',
          consentedToContact: true,
          answers: { ...validAnswers, 'not-a-real-field': 'x' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.applicationSubmission.create).not.toHaveBeenCalled();
    });

    it('rejects a malformed answer (wrong type for the field, invalid select option)', async () => {
      mockCampaign();

      await expect(
        service.submitApplication(call.slug, {
          applicantName: 'Amina Yusuf',
          applicantEmail: 'amina@example.com',
          consentedToContact: true,
          answers: {
            ...validAnswers,
            [singleSelectField.id]: 'Not A Real Option',
          },
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitApplication(call.slug, {
          applicantName: 'Amina Yusuf',
          applicantEmail: 'amina@example.com',
          consentedToContact: true,
          answers: { ...validAnswers, [emailField.id]: 'not-an-email' },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.applicationSubmission.create).not.toHaveBeenCalled();
    });

    it('allows an optional field to be omitted', async () => {
      mockCampaign();
      prisma.applicationSubmission.create.mockResolvedValue({
        id: 'cm1sub00000000000000000002',
        submittedAt: new Date(),
      });

      await expect(
        service.submitApplication(call.slug, {
          applicantName: 'Amina Yusuf',
          applicantEmail: 'amina@example.com',
          consentedToContact: true,
          answers: validAnswers, // optionalPhoneField intentionally omitted
        }),
      ).resolves.toBeDefined();
    });

    it('does not audit-log a public submission (audit is reserved for privileged actions)', async () => {
      mockCampaign();
      prisma.applicationSubmission.create.mockResolvedValue({
        id: 'cm1sub00000000000000000003',
        submittedAt: new Date(),
      });

      await service.submitApplication(call.slug, {
        applicantName: 'Amina Yusuf',
        applicantEmail: 'amina@example.com',
        consentedToContact: true,
        answers: validAnswers,
      });

      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('listSubmissions', () => {
    it('scopes the list to the requested campaign and returns the standard pagination envelope', async () => {
      prisma.callForApplication.findUnique.mockResolvedValue({
        id: call.id,
        slug: call.slug,
        title: 'Women in Tech 2026',
        status: 'OPEN',
        programType: null,
        description: null,
        openDate: null,
        closeDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const items = [{ id: 'cm1sub00000000000000000001' }];
      prisma.$transaction.mockResolvedValue([items, 1]);

      await expect(service.listSubmissions(call.id, 0, 25)).resolves.toEqual({
        items,
        total: 1,
        skip: 0,
        take: 25,
      });
    });

    it('rejects listing submissions for a nonexistent campaign', async () => {
      prisma.callForApplication.findUnique.mockResolvedValue(null);

      await expect(service.listSubmissions('missing', 0, 25)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSubmissionById', () => {
    it('returns the submission with campaign context and answers enriched with field labels', async () => {
      prisma.applicationSubmission.findUnique.mockResolvedValue({
        id: 'cm1sub00000000000000000001',
        callForApplicationId: call.id,
        applicantName: 'Amina Yusuf',
        applicantEmail: 'amina@example.com',
        reviewStatus: 'NEW',
        reviewedById: null,
        reviewedBy: null,
        submittedAt: new Date(),
        answers: { [shortTextField.id]: 'Amina Yusuf' },
        callForApplication: {
          id: call.id,
          slug: call.slug,
          title: 'Women in Tech 2026',
        },
      });
      prisma.applicationField.findMany.mockResolvedValue([shortTextField]);

      const result = await service.getSubmissionById(
        'cm1sub00000000000000000001',
      );

      expect(result.answers).toEqual([
        {
          fieldId: shortTextField.id,
          label: shortTextField.label,
          fieldType: shortTextField.fieldType,
          value: 'Amina Yusuf',
        },
      ]);
      expect(result.callForApplication).toEqual({
        id: call.id,
        slug: call.slug,
        title: 'Women in Tech 2026',
      });
    });

    it('throws not found for a missing submission', async () => {
      prisma.applicationSubmission.findUnique.mockResolvedValue(null);
      await expect(service.getSubmissionById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSubmissionStatus', () => {
    it('persists the new status, stamps the reviewer, and records an audit event', async () => {
      prisma.applicationSubmission.findUnique.mockResolvedValue({
        id: 'cm1sub00000000000000000001',
        reviewStatus: 'NEW',
      });
      prisma.applicationSubmission.update.mockResolvedValue({
        id: 'cm1sub00000000000000000001',
        reviewStatus: 'IN_REVIEW',
      });

      await expect(
        service.updateSubmissionStatus(
          'cm1sub00000000000000000001',
          'IN_REVIEW' as any,
          'actor-1',
          '127.0.0.1',
        ),
      ).resolves.toMatchObject({ reviewStatus: 'IN_REVIEW' });

      expect(prisma.applicationSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { reviewStatus: 'IN_REVIEW', reviewedById: 'actor-1' },
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBMISSION_STATUS_CHANGED',
          entityType: 'ApplicationSubmission',
          entityId: 'cm1sub00000000000000000001',
          actorId: 'actor-1',
          before: { reviewStatus: 'NEW' },
          after: { reviewStatus: 'IN_REVIEW' },
        }),
      );
    });

    it('rejects a no-op transition to the same status', async () => {
      prisma.applicationSubmission.findUnique.mockResolvedValue({
        id: 'cm1sub00000000000000000001',
        reviewStatus: 'NEW',
      });

      await expect(
        service.updateSubmissionStatus(
          'cm1sub00000000000000000001',
          'NEW' as any,
          'actor-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.applicationSubmission.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('throws not found for a missing submission', async () => {
      prisma.applicationSubmission.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSubmissionStatus(
          'missing',
          'IN_REVIEW' as any,
          'actor-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
