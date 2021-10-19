import { Module } from '@nestjs/common';
import { SpotController } from './spot.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from './entities/currency.entity';
import { ApiModule } from '../utils/api/api.module';
import { SpotService } from './spot.service';

@Module({
  imports: [TypeOrmModule.forFeature([Currency])],
  controllers: [SpotController],
  providers: [SpotService],
  exports: [],
})
export class SpotModule {}
