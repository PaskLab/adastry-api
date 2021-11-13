import { Global, Module } from '@nestjs/common';
import { BlockfrostService } from './blockfrost.service';
import { FixerioService } from './fixerio.service';
import { CoinGeckoService } from './coin-gecko.service';
import { ArmadaService } from './armada.service';

@Global()
@Module({
  imports: [],
  providers: [
    BlockfrostService,
    FixerioService,
    CoinGeckoService,
    ArmadaService,
  ],
  exports: [BlockfrostService, FixerioService, CoinGeckoService, ArmadaService],
})
export class ApiModule {}
