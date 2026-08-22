import { IsString, Matches } from 'class-validator';

// generateRandomToken() produces exactly 64 hex characters (32 random bytes),
// so anything else is malformed by definition and is rejected before the
// token is hashed and looked up.
const VERIFICATION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export class VerifyEmailDto {
  @IsString()
  @Matches(VERIFICATION_TOKEN_PATTERN)
  token!: string;
}
