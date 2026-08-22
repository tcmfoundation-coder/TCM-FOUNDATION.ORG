import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  body: true,
  publishedAt: true,
  coverImage: {
    select: {
      id: true,
      cloudinaryPublicId: true,
      secureUrl: true,
      altText: true,
    },
  },
  categories: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  coverImageId: true,
  tags: {
    select: {
      id: true,
      name: true,
    },
  },
  authorId: true,
  author: {
    select: {
      id: true,
      email: true,
    },
  },
  seoTitle: true,
  seoDescription: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(skip?: number, take?: number, categorySlug?: string) {
    const where: Prisma.ArticleWhereInput = {
      isPublished: true,
      ...(categorySlug ? { categories: { some: { slug: categorySlug } } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        select: PUBLIC_SELECT,
        orderBy: { publishedAt: 'desc' },
        skip: skip ?? 0,
        take: take ?? 100,
      }),
      this.prisma.article.count({ where }),
    ]);
    return { items, total, skip: skip ?? 0, take: take ?? 100 };
  }

  async getBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async listAdmin(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        select: ADMIN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.article.count(),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async create(dto: CreateArticleDto, actorId: string, ipAddress?: string) {
    await this.assertMediaReferences(dto.coverImageId);
    try {
      const article = await this.prisma.article.create({
        data: {
          slug: dto.slug,
          title: dto.title,
          body: dto.body,
          excerpt: dto.excerpt,
          seoTitle: dto.seoTitle,
          seoDescription: dto.seoDescription,
          coverImageId: dto.coverImageId,
          authorId: dto.authorId,
          categories: dto.categoryIds
            ? { connect: dto.categoryIds.map((id) => ({ id })) }
            : undefined,
          tags: dto.tagIds
            ? { connect: dto.tagIds.map((id) => ({ id })) }
            : undefined,
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_CREATED',
        entityType: 'Article',
        entityId: article.id,
        actorId,
        after: { slug: article.slug, isPublished: article.isPublished },
        ipAddress,
      });
      return article;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateArticleDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    await this.assertMediaReferences(dto.coverImageId);
    try {
      const article = await this.prisma.article.update({
        where: { id },
        data: {
          ...this.articleScalarData(dto),
          ...(dto.categoryIds === undefined
            ? {}
            : {
                categories: {
                  set: dto.categoryIds.map((id) => ({ id })),
                },
              }),
          ...(dto.tagIds === undefined
            ? {}
            : {
                tags: {
                  set: dto.tagIds.map((id) => ({ id })),
                },
              }),
        },
        select: ADMIN_SELECT,
      });
      await this.audit.record({
        action: 'CONTENT_UPDATED',
        entityType: 'Article',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(article),
        ipAddress,
      });
      return article;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async setPublished(
    id: string,
    isPublished: boolean,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    const article = await this.prisma.article.update({
      where: { id },
      data: { isPublished, publishedAt: isPublished ? new Date() : null },
      select: ADMIN_SELECT,
    });
    await this.audit.record({
      action: 'CONTENT_UPDATED',
      entityType: 'Article',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(article),
      ipAddress,
    });
    return article;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.article.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'Article',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private articleScalarData(dto: UpdateArticleDto) {
    const data = { ...dto };
    Reflect.deleteProperty(data, 'categoryIds');
    Reflect.deleteProperty(data, 'tagIds');
    return data;
  }

  private async assertMediaReferences(coverImageId?: string) {
    if (!coverImageId) return;
    const media = await this.prisma.media.findUnique({
      where: { id: coverImageId },
      select: { id: true, type: true },
    });
    if (!media || media.type !== 'IMAGE') {
      throw new BadRequestException('Cover image must be an existing image');
    }
  }

  private auditSnapshot(article: {
    slug: string;
    title: string;
    isPublished: boolean;
    coverImageId: string | null;
  }) {
    return {
      slug: article.slug,
      title: article.title,
      isPublished: article.isPublished,
      coverImageId: article.coverImageId,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Article slug already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Article not found');
      }
    }
    throw error;
  }
}
