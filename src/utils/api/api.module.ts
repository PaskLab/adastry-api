import { Global, Module } from '@nestjs/common';
import { BlockfrostService } from './blockfrost.service';
import { FixerioService } from './fixerio.service';
import { CoinGeckoService } from './coin-gecko.service';

@Global()
@Module({
  imports: [],
  providers: [BlockfrostService, FixerioService, CoinGeckoService],
  exports: [BlockfrostService, FixerioService, CoinGeckoService],
})
export class ApiModule {}
