import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SubscribeDto {
  @IsEmail()
  email!: string;

  // Declared so `forbidNonWhitelisted` accepts the field; TurnstileGuard has
  // already verified it server-side before this DTO is ever constructed.
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
