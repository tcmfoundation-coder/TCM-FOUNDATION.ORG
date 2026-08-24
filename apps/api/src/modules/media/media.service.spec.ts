/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
            mimeType: 'image/jpeg',
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

    it('uploads a PDF with resource_type raw and an explicit pdf format, so the delivery URL gets a real extension', async () => {
      mockUploadStream({
        result: {
          public_id: 'tcm/report-123.pdf',
          secure_url:
            'https://res.cloudinary.com/tcm/raw/upload/report-123.pdf',
        },
      });
      prisma.media.create.mockResolvedValue({
        ...media,
        cloudinaryPublicId: 'tcm/report-123.pdf',
        secureUrl: 'https://res.cloudinary.com/tcm/raw/upload/report-123.pdf',
        type: MediaType.DOCUMENT,
      });

      await service.upload(
        fakeFile({ originalname: 'report.pdf', mimetype: 'application/pdf' }),
        'Annual report',
        'actor-1',
      );

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        { resource_type: 'raw', format: 'pdf' },
        expect.any(Function),
      );
    });

    it('does not pass a format for image uploads, leaving Cloudinary auto-detection in place', async () => {
      mockUploadStream({
        result: {
          public_id: media.cloudinaryPublicId,
          secure_url: media.secureUrl,
        },
      });
      prisma.media.create.mockResolvedValue(media);

      await service.upload(fakeFile(), media.altText, 'actor-1');

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        { resource_type: 'image' },
        expect.any(Function),
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

  describe('streamById', () => {
    // Replaces the earlier approach of handing the browser a Cloudinary URL
    // directly — see media.service.ts's doc comment for why (a hand-built
    // fl_attachment URL broke in production; a cross-origin <a download>
    // can't reliably force a save even when the URL is fine). global.fetch
    // is mocked rather than hitting real Cloudinary, same rationale as the
    // rest of this file mocking the cloudinary SDK.
    let fetchSpy: jest.SpiedFunction<typeof fetch>;

    beforeEach(() => {
      fetchSpy = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    function mockUpstream(body: string, init: ResponseInit = {}) {
      fetchSpy.mockResolvedValue(new Response(body, { status: 200, ...init }));
    }

    it('streams the real bytes via a Readable, never buffering them into a Buffer/string first', async () => {
      prisma.media.findUnique.mockResolvedValue({
        secureUrl: 'https://res.cloudinary.com/tcm/raw/upload/report.pdf',
        cloudinaryPublicId: 'tcm/report.pdf',
        mimeType: 'application/pdf',
      });
      mockUpstream('%PDF-1.3 fake bytes', {
        headers: { 'content-length': '19' },
      });

      const result = await service.streamById(media.id);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://res.cloudinary.com/tcm/raw/upload/report.pdf',
      );
      expect(result.contentType).toBe('application/pdf');
      expect(result.contentLength).toBe(19);
      expect(result.extension).toBe('pdf');
      // A Readable exposes chunks via events/pipe — it does not hold the
      // whole payload as a single in-memory value the way a Buffer would.
      expect(typeof result.stream.pipe).toBe('function');
      const chunks: Buffer[] = [];
      for await (const chunk of result.stream) chunks.push(chunk as Buffer);
      expect(Buffer.concat(chunks).toString()).toBe('%PDF-1.3 fake bytes');
    });

    it('falls back to an extension parsed from the public ID when mimeType is null (pre-migration rows)', async () => {
      prisma.media.findUnique.mockResolvedValue({
        secureUrl: 'https://res.cloudinary.com/tcm/image/upload/photo.png',
        cloudinaryPublicId: 'tcm/photo.png',
        mimeType: null,
      });
      mockUpstream('fake png bytes');

      const result = await service.streamById(media.id);

      expect(result.extension).toBe('png');
      expect(result.contentType).toBe('image/png');
    });

    it('falls back to application/octet-stream when neither mimeType nor a recognizable extension is available', async () => {
      prisma.media.findUnique.mockResolvedValue({
        secureUrl: 'https://res.cloudinary.com/tcm/raw/upload/x7f3k9d2',
        cloudinaryPublicId: 'tcm/x7f3k9d2',
        mimeType: null,
      });
      mockUpstream('legacy pre-fix upload with no extension anywhere');

      const result = await service.streamById(media.id);

      expect(result.extension).toBeUndefined();
      expect(result.contentType).toBe('application/octet-stream');
    });

    it('throws NotFoundException for a missing media row, without calling fetch', async () => {
      prisma.media.findUnique.mockResolvedValue(null);

      await expect(service.streamById('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('refuses to fetch a secureUrl that is not a recognized Cloudinary delivery URL', async () => {
      prisma.media.findUnique.mockResolvedValue({
        secureUrl: 'https://attacker.example/steal-me',
        cloudinaryPublicId: 'tcm/whatever',
        mimeType: 'application/pdf',
      });

      await expect(service.streamById(media.id)).rejects.toThrow(
        BadGatewayException,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('surfaces a network failure reaching storage as BadGatewayException', async () => {
      prisma.media.findUnique.mockResolvedValue({
        secureUrl: 'https://res.cloudinary.com/tcm/raw/upload/report.pdf',
        cloudinaryPublicId: 'tcm/report.pdf',
        mimeType: 'application/pdf',
      });
      fetchSpy.mockRejectedValue(new Error('network down'));

      await expect(service.streamById(media.id)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('treats a non-2xx upstream response as the file being gone from storage', async () => {
      prisma.media.findUnique.mockResolvedValue({
        secureUrl: 'https://res.cloudinary.com/tcm/raw/upload/report.pdf',
        cloudinaryPublicId: 'tcm/report.pdf',
        mimeType: 'application/pdf',
      });
      fetchSpy.mockResolvedValue(new Response(null, { status: 404 }));

      await expect(service.streamById(media.id)).rejects.toThrow(
        NotFoundException,
      );
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
