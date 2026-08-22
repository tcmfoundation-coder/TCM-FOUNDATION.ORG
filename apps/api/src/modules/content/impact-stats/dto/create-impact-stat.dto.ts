import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateImpactStatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsInt()
  value!: number;

  @IsOptional()
  @IsInt()
  order?: number;
}
