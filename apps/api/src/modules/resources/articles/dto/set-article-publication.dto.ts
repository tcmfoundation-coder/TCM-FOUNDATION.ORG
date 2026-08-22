import { IsBoolean } from 'class-validator';

export class SetArticlePublicationDto {
  @IsBoolean()
  isPublished!: boolean;
}
