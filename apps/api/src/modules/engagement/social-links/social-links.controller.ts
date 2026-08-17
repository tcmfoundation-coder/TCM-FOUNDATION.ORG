import { Controller, Get } from '@nestjs/common';
import { SocialLinksService } from './social-links.service';

@Controller('social-links')
export class SocialLinksController {
  constructor(private readonly socialLinks: SocialLinksService) {}

  @Get()
  list() {
    return this.socialLinks.listActive();
  }
}
