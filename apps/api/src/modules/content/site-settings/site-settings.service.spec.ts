/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { SiteSettingsService } from './site-settings.service';

describe('SiteSettingsService', () => {
  let prisma: any;
  let audit: { record: jest.Mock };
  let service: SiteSettingsService;

  beforeEach(() => {
    prisma = {
      siteSettings: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new SiteSettingsService(prisma, audit as any);
  });

  describe('getPublic', () => {
    it('returns an all-null shape when no row exists yet', async () => {
      prisma.siteSettings.findUnique.mockResolvedValue(null);
      await expect(service.getPublic()).resolves.toEqual({
        navigation: null,
        footer: null,
        newsletterConfig: null,
        tcmHubPopup: null,
        brandTokens: null,
        tcmTvUrl: null,
        learningHubUrl: null,
        donateUrl: null,
        contactEmail: null,
        contactPhone: null,
        tagline: null,
      });
    });

    it('returns the real row when one exists', async () => {
      prisma.siteSettings.findUnique.mockResolvedValue({
        id: 'singleton',
        navigation: null,
        footer: null,
        newsletterConfig: null,
        tcmHubPopup: null,
        brandTokens: null,
        tcmTvUrl: 'https://youtube.com/@example',
        learningHubUrl: null,
        donateUrl: null,
        contactEmail: 'hello@example.com',
        contactPhone: null,
        tagline: 'Empowering women',
        updatedAt: new Date(),
      });
      const result = await service.getPublic();
      expect(result.tcmTvUrl).toBe('https://youtube.com/@example');
      expect(result.contactEmail).toBe('hello@example.com');
      expect(result.tagline).toBe('Empowering women');
    });
  });

  describe('update', () => {
    it('upserts the singleton row (creates it if missing) and returns the public shape', async () => {
      prisma.siteSettings.findUnique.mockResolvedValue(null);
      prisma.siteSettings.upsert.mockResolvedValue({
        id: 'singleton',
        navigation: null,
        footer: null,
        newsletterConfig: null,
        tcmHubPopup: null,
        brandTokens: null,
        tcmTvUrl: 'https://youtube.com/@example',
        learningHubUrl: null,
        donateUrl: null,
        contactEmail: null,
        contactPhone: null,
        tagline: null,
        updatedAt: new Date(),
      });

      const result = await service.update(
        { tcmTvUrl: 'https://youtube.com/@example' },
        'actor-1',
        '127.0.0.1',
      );

      expect(result.tcmTvUrl).toBe('https://youtube.com/@example');
      expect(prisma.siteSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'singleton' },
          update: { tcmTvUrl: 'https://youtube.com/@example' },
          create: expect.objectContaining({
            id: 'singleton',
            tcmTvUrl: 'https://youtube.com/@example',
          }),
        }),
      );
    });

    it('records an audit event with before/after snapshots', async () => {
      prisma.siteSettings.findUnique.mockResolvedValue({
        id: 'singleton',
        navigation: null,
        footer: null,
        newsletterConfig: null,
        tcmHubPopup: null,
        brandTokens: null,
        tcmTvUrl: null,
        learningHubUrl: null,
        donateUrl: null,
        contactEmail: null,
        contactPhone: null,
        tagline: 'Old tagline',
        updatedAt: new Date(),
      });
      prisma.siteSettings.upsert.mockResolvedValue({
        id: 'singleton',
        navigation: null,
        footer: null,
        newsletterConfig: null,
        tcmHubPopup: null,
        brandTokens: null,
        tcmTvUrl: null,
        learningHubUrl: null,
        donateUrl: null,
        contactEmail: null,
        contactPhone: null,
        tagline: 'New tagline',
        updatedAt: new Date(),
      });

      await service.update({ tagline: 'New tagline' }, 'actor-1');

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CONTENT_UPDATED',
          entityType: 'SiteSettings',
          entityId: 'singleton',
          actorId: 'actor-1',
          before: expect.objectContaining({ tagline: 'Old tagline' }),
          after: expect.objectContaining({ tagline: 'New tagline' }),
        }),
      );
    });

    it('a field omitted from the DTO is not part of the upsert payload (partial PATCH)', async () => {
      prisma.siteSettings.findUnique.mockResolvedValue(null);
      prisma.siteSettings.upsert.mockResolvedValue({
        id: 'singleton',
        navigation: null,
        footer: null,
        newsletterConfig: null,
        tcmHubPopup: null,
        brandTokens: null,
        tcmTvUrl: null,
        learningHubUrl: null,
        donateUrl: null,
        contactEmail: null,
        contactPhone: null,
        tagline: 'Only tagline',
        updatedAt: new Date(),
      });

      await service.update({ tagline: 'Only tagline' }, 'actor-1');

      const call = prisma.siteSettings.upsert.mock.calls[0][0];
      expect(call.update).toEqual({ tagline: 'Only tagline' });
      expect('contactEmail' in call.update).toBe(false);
    });
  });
});
