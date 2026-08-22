import { PartialType } from '@nestjs/mapped-types';
import { CreateImpactStatDto } from './create-impact-stat.dto';

export class UpdateImpactStatDto extends PartialType(CreateImpactStatDto) {}
