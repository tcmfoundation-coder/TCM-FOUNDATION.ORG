import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  runSearch(@Query() query: SearchQueryDto) {
    return this.search.search(query.q ?? '');
  }
}
