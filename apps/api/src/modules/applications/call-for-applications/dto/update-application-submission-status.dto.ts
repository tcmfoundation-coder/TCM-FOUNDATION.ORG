import { IsEnum } from 'class-validator';
import { ApplicationSubmissionReviewStatus } from '@prisma/client';

export class UpdateApplicationSubmissionStatusDto {
  @IsEnum(ApplicationSubmissionReviewStatus)
  reviewStatus!: ApplicationSubmissionReviewStatus;
}
