import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

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
} as const;

const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  coverImageId: true,
  categories: {
    select: {
      id: true,
      name: true,
    },
  },
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
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(skip?: number, take?: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where: { isPublished: true },
        select: PUBLIC_SELECT,
        orderBy: { publishedAt: 'desc' },
        skip: skip ?? 0,
        take: take ?? 100,
      }),
      this.prisma.blogPost.count({ where: { isPublished: true } }),
    ]);
    return { items, total, skip: skip ?? 0, take: take ?? 100 };
  }

  async getBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, isPublished: true },
      select: PUBLIC_SELECT,
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async listAdmin(skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        select: ADMIN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.blogPost.count(),
    ]);
    return { items, total, skip, take };
  }

  async getById(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      select: ADMIN_SELECT,
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async create(dto: CreateBlogPostDto, actorId: string, ipAddress?: string) {
    await this.assertMediaReferences(dto.coverImageId);
    try {
      const post = await this.prisma.blogPost.create({
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
        entityType: 'BlogPost',
        entityId: post.id,
        actorId,
        after: { slug: post.slug, isPublished: post.isPublished },
        ipAddress,
      });
      return post;
    } catch (error) {
      this.rethrowKnownPrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateBlogPostDto,
    actorId: string,
    ipAddress?: string,
  ) {
    const before = await this.getById(id);
    await this.assertMediaReferences(dto.coverImageId);
    try {
      const post = await this.prisma.blogPost.update({
        where: { id },
        data: {
          ...this.postScalarData(dto),
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
        entityType: 'BlogPost',
        entityId: id,
        actorId,
        before: this.auditSnapshot(before),
        after: this.auditSnapshot(post),
        ipAddress,
      });
      return post;
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
    const post = await this.prisma.blogPost.update({
      where: { id },
      data: { isPublished, publishedAt: isPublished ? new Date() : null },
      select: ADMIN_SELECT,
    });
    await this.audit.record({
      action: 'CONTENT_UPDATED',
      entityType: 'BlogPost',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      after: this.auditSnapshot(post),
      ipAddress,
    });
    return post;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const before = await this.getById(id);
    await this.prisma.blogPost.delete({ where: { id } });
    await this.audit.record({
      action: 'CONTENT_DELETED',
      entityType: 'BlogPost',
      entityId: id,
      actorId,
      before: this.auditSnapshot(before),
      ipAddress,
    });
  }

  private postScalarData(dto: UpdateBlogPostDto) {
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

  private auditSnapshot(post: {
    slug: string;
    title: string;
    isPublished: boolean;
    coverImageId: string | null;
  }) {
    return {
      slug: post.slug,
      title: post.title,
      isPublished: post.isPublished,
      coverImageId: post.coverImageId,
    };
  }

  private rethrowKnownPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Blog post slug already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Blog post not found');
      }
    }
    throw error;
  }
}
