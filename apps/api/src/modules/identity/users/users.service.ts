import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';

// Never select passwordHash, mfaSecretEncrypted, or any reset/verification
// token on a response path — those never leave the server.
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  emailVerifiedAt: true,
  mfaEnabled: true,
  createdAt: true,
  roles: {
    select: { role: true, status: true, assignedAt: true, activatedAt: true },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly roles: RolesService,
  ) {}

  async createStaffUser(actorId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.temporaryPassword);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
      select: SAFE_USER_SELECT,
    });

    if (dto.initialRole) {
      await this.roles.assignRole(actorId, user.id, dto.initialRole);
    }

    await this.auth.sendEmailVerification(user.id, user.email);

    return this.getById(user.id);
  }

  async listStaff(skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count(),
    ]);

    return { items, total, skip, take };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
