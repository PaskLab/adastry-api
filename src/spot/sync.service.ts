import { Injectable, Logger } from '@nestjs/common';
import config from '../../config.json';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Currency } from './entities/currency.entity';
import type { SyncConfigCurrenciesType } from '../utils/api/types/config.type';
import { FixerioService } from '../utils/api/fixerio.service';
import { CurrencyRepository } from './repositories/currency.repository';
import { Epoch } from '../epoch/entities/epoch.entity';
import { RateRepository } from './repositories/rate.repository';
import { EpochRepository } from '../epoch/repositories/epoch.repository';
import { Rate } from './entities/rate.entity';
import { SpotRepository } from './repositories/spot.repository';
import { CoinGeckoService } from '../utils/api/coin-gecko.service';
import { Spot } from './entities/spot.entity';

@Injectable()
export class SyncService {
  private readonly SYMBOLS: SyncConfigCurrenciesType = config.currencies;
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
    private readonly rateSource: FixerioService,
    private readonly spotSource: CoinGeckoService,
  ) {}

  async init(): Promise<void> {
    const currencyRepository = this.em.getCustomRepository(CurrencyRepository);

    for (const currency of this.SYMBOLS) {
      let currencyEntity = await currencyRepository.findOne({
        code: currency.code,
      });

      if (!currencyEntity) {
        currencyEntity = new Currency();
        currencyEntity.code = currency.code;
      }

      if (currencyEntity.name !== currency.name) {
        currencyEntity.name = currency.name;
        await currencyRepository.save(currencyEntity);
        this.logger.log(
          `Spot Init - Creating/Updating Currency ${currency.name}`,
        );
      }
    }
  }

  async syncRates(lastEpoch: Epoch): Promise<void> {
    const rateRepository = this.em.getCustomRepository(RateRepository);
    const lastStoredEpoch = await rateRepository.findLastEpoch();

    const startFromEpoch = lastStoredEpoch
      ? lastStoredEpoch.epoch.epoch + 1
      : 208;

    for (let i = startFromEpoch; i <= lastEpoch.epoch; i++) {
      const epoch = await this.em
        .getCustomRepository(EpochRepository)
        .findOne({ epoch: i });

      if (!epoch) {
        this.logger.log(
          `ERROR::SpotSync()->syncRates()->this.em.getCustomRepository(EpochRepository).find({epoch: ${i}) returned ${epoch}`,
        );
        continue;
      }

      const date = SyncService.dateFromUnix(epoch.startTime);
      const rates = await this.rateSource.getRate(date);

      if (!rates) {
        this.logger.log(
          `ERROR::SpotSync()->syncRates()->this.source.getRate(date) returned ${rates}`,
        );
        return;
      }

      for (const rate of rates) {
        let currency = await this.em
          .getCustomRepository(CurrencyRepository)
          .findOne({ code: rate.code });

        if (!currency) {
          currency = new Currency();
          currency.code = rate.code;
          currency.name = '';
          currency = await this.em.save(currency);
        }

        const newRate = new Rate();
        newRate.epoch = epoch;
        newRate.currency = currency;
        newRate.rate = rate.rate;

        this.em.save(newRate);
        this.logger.log(
          `Rate Sync - Creating Epoch ${epoch.epoch} history record for ${currency.name}[${currency.code}] currency`,
        );
      }
    }
  }

  async syncSpotPrices(lastEpoch: Epoch) {
    const spotRepository = this.em.getCustomRepository(SpotRepository);
    const lastStoredEpoch = await spotRepository.findLastEpoch();

    const startFromEpoch = lastStoredEpoch
      ? lastStoredEpoch.epoch.epoch + 1
      : 208;

    for (let i = startFromEpoch; i <= lastEpoch.epoch; i++) {
      const epoch = await this.em
        .getCustomRepository(EpochRepository)
        .findOne({ epoch: i });

      if (!epoch) {
        this.logger.log(
          `ERROR::SpotSync()->syncSpotPrices()->this.em.getCustomRepository(EpochRepository).find({epoch: ${i}) returned ${epoch}`,
        );
        continue;
      }

      const date = SyncService.dateFromUnix(epoch.startTime);
      const spotPrice = await this.spotSource.getSpotPrice(date);

      if (!spotPrice) {
        this.logger.log(
          `ERROR::SpotSync()->syncSpotPrices()->this.spotSource.getSpotPrice(date) returned ${spotPrice}`,
        );
        continue;
      }

      const newSpot = new Spot();
      newSpot.epoch = epoch;
      newSpot.price = spotPrice;

      this.em.save(newSpot);
      this.logger.log(
        `Spot Sync - Creating Epoch ${epoch.epoch} spot price history record`,
      );
    }
  }

  static dateFromUnix(unixTimestamp) {
    return new Date(unixTimestamp * 1000);
  }
}
