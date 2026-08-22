import { IsString, Matches } from 'class-validator';

// generateUnsubscribeToken() produces exactly 64 hex characters (32 random
// bytes), so anything else is malformed by definition and is rejected before
// it reaches a database lookup.
const UNSUBSCRIBE_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export class UnsubscribeDto {
  @IsString()
  @Matches(UNSUBSCRIBE_TOKEN_PATTERN)
  token!: string;
}
