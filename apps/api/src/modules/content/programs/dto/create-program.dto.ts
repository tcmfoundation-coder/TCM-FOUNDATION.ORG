import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

export class CreateProgramDto {
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
  @MaxLength(10_000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  objectives?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  impact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ctaLabel?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2_048)
  ctaUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(CUID_PATTERN)
  heroImageId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(CUID_PATTERN, { each: true })
  galleryMediaIds?: string[];
}
