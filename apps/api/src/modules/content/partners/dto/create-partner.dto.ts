import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

export class CreatePartnerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2_048)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(CUID_PATTERN)
  logoId?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
