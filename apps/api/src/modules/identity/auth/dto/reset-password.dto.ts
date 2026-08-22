import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// generateRandomToken() produces exactly 64 hex characters (32 random bytes),
// so anything else is malformed by definition and is rejected here rather
// than being hashed and looked up.
const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export class ResetPasswordDto {
  @IsString()
  @Matches(RESET_TOKEN_PATTERN)
  token!: string;

  // Upper bound as well as lower: the value is fed to argon2, and an
  // unbounded input is needless work for the server to do on request.
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}
