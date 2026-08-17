import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProgramsService } from './programs.service';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Get()
  list(@Query('take') take?: string) {
    return this.programs.list(take ? Number.parseInt(take, 10) : undefined);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.programs.getBySlug(slug);
  }
}
