import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CurrencyDto } from './dto/currency.dto';
import { RateDto, RateListDto } from './dto/rate.dto';
import { RateHistoryType } from './types/rate-history.type';
import { SpotDto, SpotListDto } from './dto/spot.dto';
import { HistoryParam } from '../utils/params/history.param';
import config from '../../config.json';
import { Spot } from './entities/spot.entity';
import { Currency } from './entities/currency.entity';
import { RateService } from './rate.service';

@Injectable()
export class SpotService {
  private readonly MAX_LIMIT = config.api.pageLimit;
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly rateService: RateService,
  ) {}

  async getAllCurrencies(): Promise<CurrencyDto[]> {
    const currencies = await this.em.getRepository(Currency).find();

    return currencies.map(
      (c) => new CurrencyDto({ code: c.code, name: c.name }),
    );
  }

  async getCurrency(code: string): Promise<CurrencyDto> {
    const currency = await this.em
      .getRepository(Currency)
      .findOne({ where: { code: code } });

    if (!currency) {
      throw new NotFoundException(`Currency ${code} not found.`);
    }

    return new CurrencyDto({ code: currency.code, name: currency.name });
  }

  async getRate(code: string): Promise<RateDto> {
    const rate = await this.rateService.findLastRate(code);

    if (!rate) {
      throw new NotFoundException(`Rate not found for ${code}.`);
    }

    return new RateDto({ epoch: rate.epoch.epoch, rate: rate.rate });
  }

  async getRateHistory(params: RateHistoryType): Promise<RateListDto> {
    const rates = await this.rateService.findRateHistory(params);

    return new RateListDto({
      count: rates[1],
      data: rates[0].map(
        (r) => new RateDto({ epoch: r.epoch.epoch, rate: r.rate }),
      ),
    });
  }

  async getLastPrice(code?: string): Promise<SpotDto> {
    const price = await this.findLastEpoch();

    if (!price) {
      throw new NotFoundException('Last price not found.');
    }

    if (code) {
      const rate = await this.rateService.findRateEpoch(
        code,
        price.epoch.epoch,
      );

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
    params: HistoryParam,
    code?: string,
  ): Promise<SpotListDto> {
    const pricesAndCount = await this.findPriceHistory(params);

    const count = pricesAndCount[1];
    const prices = pricesAndCount[0];

    if (code) {
      const ratesAndCount = await this.rateService.findRateHistory({
        code: code,
        ...params,
      });

      const rates = ratesAndCount[0];

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

    return new SpotListDto({
      count: count,
      data: prices.map(
        (p) => new SpotDto({ epoch: p.epoch.epoch, price: p.price }),
      ),
    });
  }

  // REPOSITORY

  async findLastEpoch(): Promise<Spot | null> {
    return this.em
      .getRepository(Spot)
      .createQueryBuilder('spot')
      .innerJoinAndSelect('spot.epoch', 'epoch')
      .orderBy('epoch.epoch', 'DESC')
      .getOne();
  }

  async findEpoch(epoch: number): Promise<Spot | null> {
    return this.em
      .getRepository(Spot)
      .createQueryBuilder('spot')
      .innerJoinAndSelect('spot.epoch', 'epoch')
      .where('epoch.epoch = :epoch', { epoch: epoch })
      .getOne();
  }

  async findPriceHistory(params: HistoryParam): Promise<[Spot[], number]> {
    const qb = this.em
      .getRepository(Spot)
      .createQueryBuilder('spot')
      .innerJoinAndSelect('spot.epoch', 'epoch')
      .take(this.MAX_LIMIT)
      .orderBy('epoch.epoch', 'DESC');

    if (params.order) {
      qb.orderBy('epoch.epoch', params.order);
    }

    if (params.limit) {
      qb.take(params.limit);
    }

    if (params.page) {
      qb.skip(
        (params.page - 1) * (params.limit ? params.limit : this.MAX_LIMIT),
      );
    }

    if (params.from) {
      if (params.order && params.order === 'ASC') {
        qb.andWhere('epoch.epoch >= :from');
      } else {
        qb.andWhere('epoch.epoch <= :from');
      }
      qb.setParameter('from', params.from);
    }

    return qb.getManyAndCount();
  }
}
