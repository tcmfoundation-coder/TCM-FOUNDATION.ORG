import { IsString, Length } from 'class-validator';

export class VerifyMfaEnrollmentDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
