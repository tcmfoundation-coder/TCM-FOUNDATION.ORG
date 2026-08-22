import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TeamMemberKind } from '@prisma/client';

export class ListTeamMembersDto {
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
  @IsEnum(TeamMemberKind)
  kind?: TeamMemberKind;
}
