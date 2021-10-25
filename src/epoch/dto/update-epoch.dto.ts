import { PartialType } from '@nestjs/mapped-types';
import { EpochDto } from './epoch.dto';

export class UpdateEpochDto extends PartialType(EpochDto) {}
