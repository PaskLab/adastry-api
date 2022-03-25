import { Module } from '@nestjs/common';
import { SpotController } from './spot.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from './entities/currency.entity';
import { SpotService } from './spot.service';
import { SyncService } from './sync.service';
import { Spot } from './entities/spot.entity';
import { Rate } from './entities/rate.entity';
import { CurrencyController } from './currency.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Currency, Spot, Rate])],
  controllers: [SpotController, CurrencyController],
  providers: [SyncService, SpotService],
  exports: [SyncService, SpotService],
})
export class SpotModule {}
