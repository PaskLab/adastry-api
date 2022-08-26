import { Injectable, Logger } from '@nestjs/common';
import config from '../../config.json';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Currency } from './entities/currency.entity';
import type { SyncConfigCurrenciesType } from '../utils/types/config.type';
import { FixerioService } from '../utils/api/fixerio.service';
import { Epoch } from '../epoch/entities/epoch.entity';
import { Rate } from './entities/rate.entity';
import { CoinGeckoService } from '../utils/api/coin-gecko.service';
import { Spot } from './entities/spot.entity';
import { RateService } from './rate.service';
import { SpotService } from './spot.service';

@Injectable()
export class SyncService {
  private readonly SYMBOLS: SyncConfigCurrenciesType = config.currencies;
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
    private readonly rateSource: FixerioService,
    private readonly spotSource: CoinGeckoService,
    private readonly rateService: RateService,
    private readonly spotService: SpotService,
  ) {}

  async init(): Promise<void> {
    const currencyRepository = this.em.getRepository(Currency);

    for (const currency of this.SYMBOLS) {
      let currencyEntity = await currencyRepository.findOne({
        where: { code: currency.code },
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
    const lastStoredEpoch = await this.rateService.findLastEpoch();

    const startFromEpoch = lastStoredEpoch
      ? lastStoredEpoch.epoch.epoch + 1
      : 208;

    for (let i = startFromEpoch; i <= lastEpoch.epoch; i++) {
      const epoch = await this.em
        .getRepository(Epoch)
        .findOne({ where: { epoch: i } });

      if (!epoch) {
        this.logger.error(
          `SpotSync()->syncRates()->this.em.getCustomRepository(EpochRepository).find({epoch: ${i}) returned ${epoch}`,
        );
        continue;
      }

      const date = SyncService.dateFromUnix(epoch.startTime);
      const rates = await this.rateSource.getRate(date);

      if (!rates) {
        this.logger.error(
          `SpotSync()->syncRates()->this.source.getRate(date) returned ${rates}`,
        );
        return;
      }

      for (const rate of rates) {
        let currency = await this.em
          .getRepository(Currency)
          .findOne({ where: { code: rate.code } });

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

        await this.em.save(newRate);
        this.logger.log(
          `Rate Sync - Creating Epoch ${epoch.epoch} history record for ${currency.name}[${currency.code}] currency`,
        );
      }
    }
  }

  async syncSpotPrices(lastEpoch: Epoch) {
    const lastStoredEpoch = await this.spotService.findLastEpoch();

    const startFromEpoch = lastStoredEpoch
      ? lastStoredEpoch.epoch.epoch + 1
      : 208;

    for (let i = startFromEpoch; i <= lastEpoch.epoch; i++) {
      const epoch = await this.em
        .getRepository(Epoch)
        .findOne({ where: { epoch: i } });

      if (!epoch) {
        this.logger.error(
          `SpotSync()->syncSpotPrices()->this.em.getCustomRepository(EpochRepository).find({epoch: ${i}) returned ${epoch}`,
        );
        continue;
      }

      const date = SyncService.dateFromUnix(epoch.startTime);
      const spotPrice = await this.spotSource.getSpotPrice(date);

      if (!spotPrice) {
        this.logger.error(
          `SpotSync()->syncSpotPrices()->this.spotSource.getSpotPrice(date) returned ${spotPrice}`,
        );
        continue;
      }

      const newSpot = new Spot();
      newSpot.epoch = epoch;
      newSpot.price = spotPrice;

      await this.em.save(newSpot);
      this.logger.log(
        `Spot Sync - Creating Epoch ${epoch.epoch} spot price history record`,
      );
    }
  }

  static dateFromUnix(unixTimestamp) {
    return new Date(unixTimestamp * 1000);
  }
}
