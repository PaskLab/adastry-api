import { PartialType } from '@nestjs/mapped-types';
import { CreateEpochDto } from './create-epoch.dto';

export class UpdateEpochDto extends PartialType(CreateEpochDto) {}
