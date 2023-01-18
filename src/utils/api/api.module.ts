import { Global, Module } from '@nestjs/common';
import { BlockfrostService } from './blockfrost.service';
import { FixerioService } from './fixerio.service';
import { CoinGeckoService } from './coin-gecko.service';
import { ArmadaService } from './armada.service';
import { BlockfrostProxyService } from './blockfrost-proxy.service';
import { ProxyController } from './proxy.controller';

@Global()
@Module({
  imports: [],
  controllers: [ProxyController],
  providers: [
    BlockfrostService,
    BlockfrostProxyService,
    FixerioService,
    CoinGeckoService,
    ArmadaService,
  ],
  exports: [BlockfrostService, FixerioService, CoinGeckoService, ArmadaService],
})
export class ApiModule {}
