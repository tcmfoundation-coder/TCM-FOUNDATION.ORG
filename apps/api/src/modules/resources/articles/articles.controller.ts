import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  list(@Query('take') take?: string) {
    return this.articles.list(take ? Number.parseInt(take, 10) : undefined);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.articles.getBySlug(slug);
  }
}
