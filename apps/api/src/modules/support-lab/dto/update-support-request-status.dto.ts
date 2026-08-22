import { IsEnum } from 'class-validator';
import { SupportRequestStatus } from '@prisma/client';

export class UpdateSupportRequestStatusDto {
  @IsEnum(SupportRequestStatus)
  status!: SupportRequestStatus;
}
