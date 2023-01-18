import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { BlockfrostProxyService } from './blockfrost-proxy.service';
import { components } from '@blockfrost/blockfrost-js/lib/types/OpenApi';

@ApiTags('Lucid Proxy')
@Controller('proxy')
export class ProxyController {
  constructor(private readonly proxy: BlockfrostProxyService) {}

  @Get('protocol-parameters')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProtocolParameters(): Promise<
    components['schemas']['epoch_param_content']
  > {
    return this.proxy.getProtocolParameters();
  }

  @Get('addresses/:address/utxos')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getUtxos(
    @Param('address') address: string,
    @Query('page') page?: number,
  ): Promise<components['schemas']['address_utxo_content']> {
    return this.proxy.getUtxos(address, page);
  }

  @Get('addresses/:address/utxos/:asset')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getUtxosWithUnit(
    @Param('address') address: string,
    @Param('asset') asset: string,
    @Query('page') page?: number,
  ): Promise<components['schemas']['address_utxo_content']> {
    return this.proxy.getUtxosWithUnit(address, asset, page);
  }

  @Get('tx/:hash')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async txInfo(
    @Param('hash') hash: string,
  ): Promise<components['schemas']['tx_content']> {
    return this.proxy.txInfo(hash);
  }

  @Post('submit')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async submit(@Body() body: any): Promise<string> {
    return this.proxy.submit(body);
  }
}
