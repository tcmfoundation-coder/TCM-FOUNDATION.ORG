import { SetMetadata } from '@nestjs/common';
import type { PrivilegedRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: PrivilegedRole[]) =>
  SetMetadata(ROLES_KEY, roles);
