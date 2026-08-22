import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationFieldDto } from './create-application-field.dto';

export class UpdateApplicationFieldDto extends PartialType(
  CreateApplicationFieldDto,
) {}
