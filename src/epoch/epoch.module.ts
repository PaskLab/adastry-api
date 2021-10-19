import { Module } from '@nestjs/common';
import { EpochController } from './epoch.controller';
import { SyncService } from './sync.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Epoch } from './entities/epoch.entity';
import { ApiModule } from '../utils/api/api.module';
import { EpochService } from './epoch.service';

@Module({
  imports: [TypeOrmModule.forFeature([Epoch])],
  controllers: [EpochController],
  providers: [SyncService, EpochService],
  exports: [SyncService],
})
export class EpochModule {}
