import { IsEnum, IsString } from 'class-validator';
import { PrivilegedRole } from '@prisma/client';

export class AssignRoleDto {
  @IsString()
  userId!: string;

  @IsEnum(PrivilegedRole)
  role!: PrivilegedRole;
}
