import { Injectable } from '@nestjs/common';
import config from '../../../config.json';
import { request as apiRequest } from './api.helper';

@Injectable()
export class CoinGeckoService {
  private readonly PROVIDER_URL: string = config.provider.coingecko.url;

  async getSpotPrice(date: Date): Promise<number | null> {
    const result = await this.request(
      `/coins/cardano/history?date=${CoinGeckoService.formatDate(date)}`,
    );

    return result && !result.error
      ? result.market_data.current_price.eur
      : null;
  }

  static formatDate(date: Date): string {
    const zeroLead = (str) => ('0' + str).slice(-2);
    const fDate = {
      year: date.getFullYear(),
      month: zeroLead(date.getMonth() + 1),
      day: zeroLead(date.getDate()),
    };

    return `${fDate.day}-${fDate.month}-${fDate.year}`;
  }

  private async request(endpoint: string, headers?: any): Promise<any | null> {
    return await apiRequest(this.PROVIDER_URL, endpoint, headers);
  }
}
