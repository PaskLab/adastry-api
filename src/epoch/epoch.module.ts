import { Module } from '@nestjs/common';
import { EpochController } from './epoch.controller';
import { SyncService } from './sync.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Epoch } from './entities/epoch.entity';
import { EpochService } from './epoch.service';

export const entities = [Epoch];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  controllers: [EpochController],
  providers: [SyncService, EpochService],
  exports: [SyncService, EpochService],
})
export class EpochModule {}
