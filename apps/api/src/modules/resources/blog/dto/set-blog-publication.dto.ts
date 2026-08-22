import { IsBoolean } from 'class-validator';

export class SetBlogPublicationDto {
  @IsBoolean()
  isPublished!: boolean;
}
