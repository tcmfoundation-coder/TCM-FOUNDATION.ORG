import { IsBoolean } from 'class-validator';

export class SetProgramPublicationDto {
  @IsBoolean()
  isPublished!: boolean;
}
