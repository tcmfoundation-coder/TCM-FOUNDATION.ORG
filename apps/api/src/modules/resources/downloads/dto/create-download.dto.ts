import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

export class CreateDownloadDto {
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(200)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @IsString()
  @Matches(CUID_PATTERN)
  fileId!: string;
}
