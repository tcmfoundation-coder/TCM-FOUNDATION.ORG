import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrivilegedRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(PrivilegedRole.SUPER_ADMINISTRATOR)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.users.createStaffUser(actor.id, dto);
  }

  @Get()
  @Roles(PrivilegedRole.ADMINISTRATOR, PrivilegedRole.SUPER_ADMINISTRATOR)
  list(@Query('skip') skip?: string, @Query('take') take?: string) {
    const skipNum = Number.parseInt(skip ?? '0', 10) || 0;
    const takeNum = Math.min(Number.parseInt(take ?? '20', 10) || 20, 100);
    return this.users.listStaff(skipNum, takeNum);
  }

  @Get(':id')
  @Roles(PrivilegedRole.ADMINISTRATOR, PrivilegedRole.SUPER_ADMINISTRATOR)
  getById(@Param('id') id: string) {
    return this.users.getById(id);
  }
}
