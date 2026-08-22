import { PartialType } from '@nestjs/mapped-types';
import { CreateSpotlightDto } from './create-spotlight.dto';

export class UpdateSpotlightDto extends PartialType(CreateSpotlightDto) {}
