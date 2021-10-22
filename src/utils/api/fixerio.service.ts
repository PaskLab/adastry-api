import fetch from 'node-fetch';
import config from '../../../sync-config.json';
import { Injectable } from '@nestjs/common';
import type { SyncConfigCurrencies } from '../../sync/types/sync-config.type';

const PROVIDER_URL: string = config.provider.fixerio.url;
const SYMBOLS = config.currencies;

@Injectable()
export class FixerioService {
  async getRate(timestamp: number) {
    const symbols = SYMBOLS.map((s) => s.code);

    console.log(
      `?access_key=${process.env.FIXERIO_API_KEY}&symbols=${symbols.join(',')}`,
    );

    // const result = await this.request(
    //   `?access_key=${process.env.FIXERIO_API_KEY}&symbols=${symbols.join(',')}`,
    // );

    // return result
    //   ? result.map((res) => ({
    //       epoch: res.epoch,
    //       rewards: res.rewards,
    //       fees: res.fees,
    //       blocks: res.blocks,
    //       activeStake: res.active_stake,
    //     }))
    //   : null;
  }

  private async request(endpoint: string, headers?: any): Promise<any | null> {
    return await fetch(PROVIDER_URL + endpoint, {
      headers: {
        ...headers,
        'User-Agent': 'rewards-tracker',
      },
      method: 'GET',
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          console.log(res.status, res.url, res.statusText);
          return null;
        }
      })
      .catch(console.log);
  }
}
