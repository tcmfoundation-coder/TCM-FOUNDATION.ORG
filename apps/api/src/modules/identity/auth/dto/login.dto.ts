import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  // Upper bound as well as lower: the value is fed to argon2.verify, and an
  // unbounded input is needless work for the server to do on request.
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
