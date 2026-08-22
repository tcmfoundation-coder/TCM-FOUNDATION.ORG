import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TeamMemberKind } from '@prisma/client';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

export class CreateTeamMemberDto {
  @IsEnum(TeamMemberKind)
  kind!: TeamMemberKind;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  bio?: string;

  @IsOptional()
  @IsString()
  @Matches(CUID_PATTERN)
  photoId?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
