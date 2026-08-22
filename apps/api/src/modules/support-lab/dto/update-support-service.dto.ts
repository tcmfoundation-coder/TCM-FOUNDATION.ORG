import { PartialType } from '@nestjs/mapped-types';
import { CreateSupportServiceDto } from './create-support-service.dto';

export class UpdateSupportServiceDto extends PartialType(
  CreateSupportServiceDto,
) {}
