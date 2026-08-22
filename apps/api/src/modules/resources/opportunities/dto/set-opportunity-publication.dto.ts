import { IsBoolean } from 'class-validator';

export class SetOpportunityPublicationDto {
  @IsBoolean()
  isPublished!: boolean;
}
