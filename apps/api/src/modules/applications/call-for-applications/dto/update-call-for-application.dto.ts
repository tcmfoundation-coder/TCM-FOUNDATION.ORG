import { PartialType } from '@nestjs/mapped-types';
import { CreateCallForApplicationDto } from './create-call-for-application.dto';

export class UpdateCallForApplicationDto extends PartialType(
  CreateCallForApplicationDto,
) {}
