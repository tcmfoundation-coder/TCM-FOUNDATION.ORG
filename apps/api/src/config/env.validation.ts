import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

// Mirrors plan section 10 (Required Environment Variables). Only the
// variables needed to boot the Phase 1 skeleton are required; integration
// credentials (Google OAuth, Cloudinary, email, GA4, Turnstile) become
// required as their respective modules are implemented in later phases.
class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV?: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  SESSION_COOKIE_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  MFA_ENCRYPTION_KEY!: string;

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GOOGLE_OAUTH_CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_CLOUD_NAME?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_KEY?: string;

  @IsOptional()
  @IsString()
  CLOUDINARY_API_SECRET?: string;

  // Transactional email. Optional here because local development runs without
  // a provider; the real requirement is conditional (resend needs both
  // RESEND_API_KEY and EMAIL_FROM) and is enforced at boot by
  // createMailService, which can see how the three relate to each other.
  @IsOptional()
  @IsIn(['resend', 'console'])
  EMAIL_PROVIDER?: string;

  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;

  @IsOptional()
  @IsString()
  EMAIL_FROM?: string;

  @IsOptional()
  @IsString()
  GA_MEASUREMENT_ID?: string;

  @IsOptional()
  @IsString()
  TURNSTILE_SITE_KEY?: string;

  @IsOptional()
  @IsString()
  TURNSTILE_SECRET_KEY?: string;

  // Number of reverse proxies in front of this instance. See main.ts for why
  // this is opt-in rather than defaulted on.
  @IsOptional()
  @IsNumberString()
  TRUST_PROXY_HOPS?: string;

  @IsOptional()
  @IsString()
  APP_BASE_URL?: string;

  @IsOptional()
  @IsString()
  API_BASE_URL?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }

  return validated;
}
