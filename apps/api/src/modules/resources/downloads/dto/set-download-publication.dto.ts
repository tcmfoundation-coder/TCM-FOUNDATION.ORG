import { IsBoolean } from 'class-validator';

export class SetDownloadPublicationDto {
  @IsBoolean()
  isPublished!: boolean;
}
