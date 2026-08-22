import { IsString, MaxLength, MinLength } from 'class-validator';

export class UploadMediaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  altText!: string;
}
