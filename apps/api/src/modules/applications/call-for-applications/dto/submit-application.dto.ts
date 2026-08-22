import {
  Equals,
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// `answers` is a map of ApplicationField.id -> answer value (string for
// SHORT_TEXT/LONG_TEXT/EMAIL/PHONE/SINGLE_SELECT, string[] for
// MULTI_SELECT). Its shape is campaign-specific (driven by whatever fields
// the campaign actually has), so it can't be statically typed with
// decorators the way the rest of this DTO is — CallForApplicationsService
// validates required/unknown fields and per-field types against the
// campaign's real ApplicationField rows before persisting.
export class SubmitApplicationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  applicantName!: string;

  @IsEmail()
  applicantEmail!: string;

  @IsObject()
  answers!: Record<string, unknown>;

  // Enforced here, not only in the browser. The form's checkbox stops an
  // ordinary applicant submitting without agreeing, but a direct POST would
  // bypass it entirely — and "the applicant agreed to be contacted" is a claim
  // TCM may later have to stand behind. `Equals(true)` means a missing or
  // false value is a 400, never a silently accepted submission.
  @IsBoolean()
  @Equals(true, {
    message:
      'You must accept the Terms and Conditions and consent to being contacted to submit an application.',
  })
  consentedToContact!: boolean;

  // Declared so `forbidNonWhitelisted` accepts the field; TurnstileGuard has
  // already verified it server-side before this DTO is ever constructed.
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
