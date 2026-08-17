import { Controller, Get, Query } from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';

@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Get()
  list(@Query('take') take?: string) {
    return this.testimonials.list(take ? Number.parseInt(take, 10) : undefined);
  }
}
