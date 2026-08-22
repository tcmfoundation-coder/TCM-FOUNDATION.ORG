import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsJSON,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApplicationFieldType } from '@prisma/client';

export class CreateApplicationFieldDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsEnum(ApplicationFieldType)
  fieldType!: ApplicationFieldType;

  @IsOptional()
  @IsBoolean()
  isRequired = true;

  @IsOptional()
  @IsJSON()
  options?: string;

  @IsOptional()
  @IsInt()
  order = 0;
}
