import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CurrencyRepository } from './repositories/currency.repository';
import { CurrencyDto } from './dto/currency.dto';
import { RateRepository } from './repositories/rate.repository';
import { RateDto } from './dto/rate.dto';
import { RateHistoryType } from './types/rate-history.type';
import { SpotRepository } from './repositories/spot.repository';
import { SpotDto } from './dto/spot.dto';
import { HistoryQuery } from '../utils/params/history.query';

@Injectable()
export class SpotService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async getAllCurrencies(): Promise<CurrencyDto[]> {
    const currencies = await this.em
      .getCustomRepository(CurrencyRepository)
      .find();

    return currencies.map(
      (c) => new CurrencyDto({ code: c.code, name: c.name }),
    );
  }

  async getCurrency(code: string): Promise<CurrencyDto> {
    const currency = await this.em
      .getCustomRepository(CurrencyRepository)
      .findOne({ code: code });

    if (!currency) {
      throw new NotFoundException(`Currency ${code} not found.`);
    }

    return new CurrencyDto({ code: currency.code, name: currency.name });
  }

  async getRate(code: string): Promise<RateDto> {
    const rate = await this.em
      .getCustomRepository(RateRepository)
      .findLastRate(code);

    if (!rate) {
      throw new NotFoundException(`Rate not found for ${code}.`);
    }

    return new RateDto({ epoch: rate.epoch.epoch, rate: rate.rate });
  }

  async getRateHistory(params: RateHistoryType): Promise<RateDto[]> {
    const rates = await this.em
      .getCustomRepository(RateRepository)
      .findRateHistory(params);

    return rates.map(
      (r) => new RateDto({ epoch: r.epoch.epoch, rate: r.rate }),
    );
  }

  async getLastPrice(code?: string): Promise<SpotDto> {
    const price = await this.em
      .getCustomRepository(SpotRepository)
      .findLastEpoch();

    if (!price) {
      throw new NotFoundException('Last price not found.');
    }

    if (code) {
      const rate = await this.em
        .getCustomRepository(RateRepository)
        .findRateEpoch(code, price.epoch.epoch);

      if (!rate) {
        throw new NotFoundException(
          `Epoch ${price.epoch.epoch} rate not found for ${code}.`,
        );
      }

      price.price = rate.rate * price.price;
    }

    return new SpotDto({ epoch: price.epoch.epoch, price: price.price });
  }

  async getPriceHistory(
    params: HistoryQuery,
    code?: string,
  ): Promise<SpotDto[]> {
    const prices = await this.em
      .getCustomRepository(SpotRepository)
      .findPriceHistory(params);

    if (code) {
      const rates = await this.em
        .getCustomRepository(RateRepository)
        .findRateHistory({
          code: code,
          ...params,
        });

      for (const price of prices) {
        const rate = rates.find(
          (rate) => rate.epoch.epoch === price.epoch.epoch,
        );

        if (!rate) {
          throw new NotFoundException(
            `Missing epoch ${price.epoch.epoch} rate for ${code}.`,
          );
        }

        price.price = price.price * rate.rate;
      }
    }

    return prices.map(
      (p) => new SpotDto({ epoch: p.epoch.epoch, price: p.price }),
    );
  }
}
