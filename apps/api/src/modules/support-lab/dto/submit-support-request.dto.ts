import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const CUID_PATTERN = /^c[a-z0-9]{24,}$/;

// Public submission — only the fields a visitor is allowed to supply.
// status/handledById are never accepted here (server-assigned defaults),
// which is what keeps this safe from mass assignment.
export class SubmitSupportRequestDto {
  @IsString()
  @Matches(CUID_PATTERN)
  serviceId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  requesterName!: string;

  @IsEmail()
  requesterEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  requesterPhone?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  message!: string;

  // Declared so `forbidNonWhitelisted` accepts the field; TurnstileGuard has
  // already verified it server-side before this DTO is ever constructed.
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
