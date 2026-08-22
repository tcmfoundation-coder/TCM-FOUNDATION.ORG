import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTestimonialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  authorName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  authorRole?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  quote!: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
