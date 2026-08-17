import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { TeamMemberKind } from '@prisma/client';
import { TeamService } from './team.service';

@Controller('team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list(@Query('kind') kind?: string) {
    if (
      kind &&
      !Object.values(TeamMemberKind).includes(kind as TeamMemberKind)
    ) {
      throw new BadRequestException(
        `Invalid kind. Must be one of: ${Object.values(TeamMemberKind).join(', ')}`,
      );
    }
    return this.team.list(kind as TeamMemberKind | undefined);
  }
}
