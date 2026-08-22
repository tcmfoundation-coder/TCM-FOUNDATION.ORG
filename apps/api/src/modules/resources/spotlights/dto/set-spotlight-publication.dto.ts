import { IsBoolean } from 'class-validator';

export class SetSpotlightPublicationDto {
  @IsBoolean()
  isPublished!: boolean;
}
