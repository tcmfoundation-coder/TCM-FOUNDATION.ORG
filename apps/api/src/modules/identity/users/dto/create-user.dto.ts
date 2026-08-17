import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PrivilegedRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  temporaryPassword!: string;

  @IsOptional()
  @IsEnum(PrivilegedRole)
  initialRole?: PrivilegedRole;
}
