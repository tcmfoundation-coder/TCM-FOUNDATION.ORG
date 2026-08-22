import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Query filters for the public FAQ list. Separate from ListFaqsDto (the
 * admin pagination DTO) because the public route filters rather than pages.
 * Both fields feed database filters, so both are length-bounded here instead
 * of arriving as unbounded strings.
 */
export class ListPublicFaqsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;
}
