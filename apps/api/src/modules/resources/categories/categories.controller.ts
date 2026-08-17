import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CategoryAppliesTo } from '@prisma/client';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@Query('appliesTo') appliesTo?: string) {
    if (
      appliesTo &&
      !Object.values(CategoryAppliesTo).includes(appliesTo as CategoryAppliesTo)
    ) {
      throw new BadRequestException(
        `Invalid appliesTo. Must be one of: ${Object.values(CategoryAppliesTo).join(', ')}`,
      );
    }
    return this.categories.list(appliesTo as CategoryAppliesTo | undefined);
  }
}
