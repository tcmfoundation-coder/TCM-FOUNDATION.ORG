import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

// Every field is optional and independently nullable — a PATCH only
// touches the keys it actually sends (see SiteSettingsService.update),
// and an admin can explicitly clear a value by sending null (e.g. to
// remove a URL once it's no longer valid) without affecting the rest of
// the singleton row. Mirrors every field the SiteSettings model actually
// has (schema.prisma) — nothing invented, nothing restricted beyond what
// the model itself exposes.
export class UpdateSiteSettingsDto {
  @IsOptional()
  @IsObject()
  navigation?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  footer?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  newsletterConfig?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  tcmHubPopup?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  brandTokens?: Record<string, unknown> | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  tcmTvUrl?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  learningHubUrl?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  donateUrl?: string | null;

  @IsOptional()
  @IsEmail()
  contactEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tagline?: string | null;
}
