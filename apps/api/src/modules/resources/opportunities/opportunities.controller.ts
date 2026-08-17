import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { OpportunityType } from '@prisma/client';
import { OpportunitiesService } from './opportunities.service';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get()
  list(@Query('type') type?: string) {
    if (
      type &&
      !Object.values(OpportunityType).includes(type as OpportunityType)
    ) {
      throw new BadRequestException(
        `Invalid type. Must be one of: ${Object.values(OpportunityType).join(', ')}`,
      );
    }
    return this.opportunities.list(type as OpportunityType | undefined);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.opportunities.getBySlug(slug);
  }
}
