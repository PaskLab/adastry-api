import config from '../../../config.json';
import { Injectable } from '@nestjs/common';
import type { RateType } from './types/rate.type';
import { request as apiRequest } from './api.helper';

@Injectable()
export class FixerioService {
  private readonly PROVIDER_URL: string = config.provider.fixerio.url;

  async getRate(date: Date): Promise<RateType | null> {
    const result = await this.request(
      `/${FixerioService.formatDate(date)}?access_key=${
        process.env.FIXERIO_API_KEY
      }`,
    );

    return result && result.success
      ? Object.keys(result.rates).map((code) => ({
          code: code,
          rate: result.rates[code],
        }))
      : null;
  }

  static formatDate(date: Date): string {
    const zeroLead = (str) => ('0' + str).slice(-2);
    const fDate = {
      year: date.getFullYear(),
      month: zeroLead(date.getMonth() + 1),
      day: zeroLead(date.getDate()),
    };

    return `${fDate.year}-${fDate.month}-${fDate.day}`;
  }

  private async request(endpoint: string, headers?: any): Promise<any | null> {
    return await apiRequest(this.PROVIDER_URL, endpoint, headers);
  }
}
