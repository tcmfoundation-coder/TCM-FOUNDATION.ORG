import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// Fields match the client-confirmed spec exactly (see ContactSubmission
// model comment): Full Name, Email Address, Phone Number (optional),
// Organization (optional), Subject, Message.
export class CreateContactSubmissionDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsString()
  @MinLength(1)
  subject!: string;

  @IsString()
  @MinLength(1)
  message!: string;

  // Declared so `forbidNonWhitelisted` accepts the field; TurnstileGuard has
  // already verified it server-side before this DTO is ever constructed.
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
