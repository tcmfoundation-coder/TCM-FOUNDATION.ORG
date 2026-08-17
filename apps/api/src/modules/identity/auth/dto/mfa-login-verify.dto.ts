import { IsString, Length } from 'class-validator';

export class MfaLoginVerifyDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
