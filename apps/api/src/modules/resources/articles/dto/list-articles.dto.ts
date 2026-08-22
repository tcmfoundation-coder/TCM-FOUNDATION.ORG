import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListArticlesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take = 25;

  // Category slug filter accepted by the public list route. Bounded to the
  // same length slugs are stored at, so an oversized value is rejected
  // rather than passed through to a query.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;
}
