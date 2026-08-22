import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// The Media model has no `tags` field (see schema.prisma) — only altText
// is mutable after upload.
export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  altText?: string;
}
