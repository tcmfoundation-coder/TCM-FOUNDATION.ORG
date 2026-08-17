import { Controller, Get, Param, Query } from '@nestjs/common';
import { BlogService } from './blog.service';

@Controller('blog')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  list(@Query('take') take?: string) {
    return this.blog.list(take ? Number.parseInt(take, 10) : undefined);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.blog.getBySlug(slug);
  }
}
