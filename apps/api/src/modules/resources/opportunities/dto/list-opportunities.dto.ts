import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OpportunityType } from '@prisma/client';

export class ListOpportunitiesDto {
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

  @IsOptional()
  @IsEnum(OpportunityType)
  type?: OpportunityType;
}
