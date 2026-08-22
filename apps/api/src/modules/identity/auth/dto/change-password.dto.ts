import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  // Bounded on both ends: both values are fed to argon2, and an unbounded
  // input is needless work for the server to do on request.
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}
