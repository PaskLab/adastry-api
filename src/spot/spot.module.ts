import { Module } from '@nestjs/common';
import { SpotController } from './spot.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from './entities/currency.entity';
import { SpotService } from './spot.service';
import { SyncService } from './sync.service';
import { Spot } from './entities/spot.entity';
import { Rate } from './entities/rate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Currency, Spot, Rate])],
  controllers: [SpotController],
  providers: [SyncService, SpotService],
  exports: [SyncService],
})
export class SpotModule {}
