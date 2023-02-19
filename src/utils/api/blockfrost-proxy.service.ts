import config from '../../../config.json';
import { Injectable } from '@nestjs/common';
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { components } from '@blockfrost/blockfrost-js/lib/types/OpenApi';
import { request as apiRequest } from './api.helper';
import * as process from 'process';

@Injectable()
export class BlockfrostProxyService {
  private readonly PROVIDER_URL: string = config.provider.blockfrost.url;
  private readonly PROVIDER_RATE: number = config.provider.blockfrost.rate;
  private nextCallTime = new Date();
  private api: BlockFrostAPI;

  constructor() {
    this.api = new BlockFrostAPI({
      projectId: process.env.BLOCKFROST_API_KEY!,
      debug: process.env.NODE_ENV === 'development',
    });
  }

  async getProtocolParameters(): Promise<
    components['schemas']['epoch_param_content']
  > {
    return this.request('/epochs/latest/parameters');
  }

  async getUtxos(
    address: string,
    page?: number,
  ): Promise<components['schemas']['address_utxo_content']> {
    return this.api.addressesUtxos(address, { page });
  }

  async getUtxosWithUnit(
    address: string,
    asset: string,
    page?: number,
  ): Promise<components['schemas']['address_utxo_content']> {
    return this.api.addressesUtxosAsset(address, asset, { page });
  }

  async txInfo(hash: string): Promise<components['schemas']['tx_content']> {
    return this.api.txs(hash);
  }

  async request(
    endpoint: string,
    headers?: any,
    body?: any,
  ): Promise<any | null> {
    let callDelay = 0;
    const now = new Date();
    if (this.nextCallTime > now) {
      callDelay = this.nextCallTime.valueOf() - now.valueOf();
      this.nextCallTime.setTime(
        this.nextCallTime.valueOf() + this.PROVIDER_RATE,
      );
    } else {
      this.nextCallTime.setTime(now.valueOf() + this.PROVIDER_RATE);
    }

    return new Promise<any>((resolve) => {
      setTimeout(
        () =>
          resolve(
            apiRequest(
              this.PROVIDER_URL,
              endpoint,
              {
                project_id: process.env.BLOCKFROST_API_KEY,
                ...headers,
              },
              body,
            ),
          ),
        callDelay,
      );
    });
  }
}
