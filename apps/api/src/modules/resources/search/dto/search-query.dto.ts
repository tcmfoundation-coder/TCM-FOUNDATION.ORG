import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchQueryDto {
  /**
   * Bounded because this term becomes an ILIKE '%term%' scan across five
   * tables in parallel (search.service.ts). Nothing legitimate needs more
   * than this, and leaving it open lets one request do far more work than a
   * search should.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
