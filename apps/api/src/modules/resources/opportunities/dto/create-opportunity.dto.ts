import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OpportunityType } from '@prisma/client';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateOpportunityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(SLUG_PATTERN)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsEnum(OpportunityType)
  type!: OpportunityType;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  // The Opportunities Desk only ever links out (see the Opportunity model
  // comment) — an application is completed on the external site, never here,
  // so this is required rather than optional.
  @IsUrl({ require_protocol: true })
  externalApplyUrl!: string;
}
