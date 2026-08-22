/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { MediaType } from '@prisma/client';
import { MediaService } from './media.service';

jest.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

function mockUploadStream(
  outcome:
    | {
        result: {
          public_id: string;
          secure_url: string;
          width?: number;
          height?: number;
        };
      }
    | { error: Error },
) {
  (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
    (_options, callback) => ({
      end: () => {
        if ('error' in outcome) {
          callback(outcome.error, undefined);
        } else {
          callback(undefined, outcome.result);
        }
      },
    }),
  );
}

function fakeFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake-image-bytes'),
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
    ...overrides,
  };
}

describe('MediaService', () => {
  const media = {
    id: 'cm1abcdefghijklmno1234567',
    cloudinaryPublicId: 'tcm/photo-123',
    secureUrl: 'https://res.cloudinary.com/tcm/image/upload/photo-123.jpg',
    type: MediaType.IMAGE,
    altText: 'A photo',
    width: 800,
    height: 600,
  };

  let prisma: any;
  let audit: { record: jest.Mock };
  let service: MediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      media: {
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
    service = new MediaService(prisma, audit as any);
  });

  describe('upload', () => {
    it('uploads a valid image via a buffer stream and records MEDIA_UPLOADED', async () => {
      mockUploadStream({
        result: {
          public_id: media.cloudinaryPublicId,
          secure_url: media.secureUrl,
          width: media.width,
          height: media.height,
        },
      });
      prisma.media.create.mockResolvedValue(media);

      const result = await service.upload(
        fakeFile(),
        media.altText,
        'actor-1',
        '127.0.0.1',
      );

      expect(result).toEqual(media);
      expect(prisma.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cloudinaryPublicId: media.cloudinaryPublicId,
            secureUrl: media.secureUrl,
            type: MediaType.IMAGE,
            altText: media.altText,
            uploadedById: 'actor-1',
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MEDIA_UPLOADED',
          entityId: media.id,
        }),
      );
    });

    it('rejects an unsupported file type before touching Cloudinary or the database', async () => {
      await expect(
        service.upload(
          fakeFile({ mimetype: 'application/x-msdownload' }),
          'alt',
          'actor-1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
      expect(prisma.media.create).not.toHaveBeenCalled();
    });

    it('wraps a Cloudinary upload failure in a BadRequestException without persisting a record', async () => {
      mockUploadStream({ error: new Error('Cloudinary is down') });

      await expect(
        service.upload(fakeFile(), 'alt', 'actor-1'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.media.create).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('destroys the Cloudinary asset, deletes the record, and records MEDIA_DELETED', async () => {
      prisma.media.findUnique.mockResolvedValue(media);
      prisma.media.delete.mockResolvedValue(media);

      await service.remove(media.id, 'actor-1', '127.0.0.1');

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        media.cloudinaryPublicId,
      );
      expect(prisma.media.delete).toHaveBeenCalledWith({
        where: { id: media.id },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MEDIA_DELETED',
          entityId: media.id,
        }),
      );
    });

    it('throws not found for an absent record and never calls Cloudinary', async () => {
      prisma.media.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', 'actor-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('filters by a validated MediaType enum value, not a raw string', async () => {
      prisma.$transaction.mockResolvedValue([[media], 1]);

      await service.list(0, 25, MediaType.IMAGE);

      expect(prisma.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: MediaType.IMAGE } }),
      );
    });
  });
});
