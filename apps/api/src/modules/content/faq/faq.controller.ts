import { Controller, Get } from '@nestjs/common';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
  constructor(private readonly faq: FaqService) {}

  @Get()
  list() {
    return this.faq.list();
  }
}
