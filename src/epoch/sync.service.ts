import { Injectable, Logger } from '@nestjs/common';
import config from '../../config.json';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Epoch } from './entities/epoch.entity';
import { BlockfrostService } from '../utils/api/blockfrost.service';
import type { EpochType } from '../utils/api/types/epoch.type';
import { EpochService } from './epoch.service';

@Injectable()
export class SyncService {
  private readonly PROVIDER_LIMIT = config.provider.blockfrost.limit;
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly source: BlockfrostService,
    private readonly epochService: EpochService,
  ) {}

  async syncEpoch(): Promise<Epoch | null> {
    this.logger.log('Starting EpochSync:syncEpoch() ...');

    const lastEpoch = await this.source.lastEpoch();

    if (!lastEpoch) {
      this.logger.error(
        `EpochSync()->syncEpoch()->source.lastEpoch() returned null`,
      );
      return null;
    }

    let lastStoredEpoch = await this.epochService.findLastEpoch();

    if (!lastStoredEpoch || lastEpoch.epoch !== lastStoredEpoch.epoch) {
      // Last epoch synchronized separately, use -1 or use 208
      const epochToSync = lastStoredEpoch
        ? lastEpoch.epoch - lastStoredEpoch.epoch - 1
        : lastEpoch.epoch - 208;
      const pages = Math.ceil(epochToSync / this.PROVIDER_LIMIT);

      let history: EpochType[] = [];

      for (let i = pages; i >= 1; i--) {
        const limit =
          pages === 1 ? epochToSync % this.PROVIDER_LIMIT : this.PROVIDER_LIMIT;
        const upstreamHistory = await this.source.getEpochHistory(
          lastEpoch.epoch,
          i,
          limit,
        );

        if (!upstreamHistory) {
          this.logger.log(
            `ERROR::EpochSync()->syncEpoch()
              ->this.source.getEpochHistory(${lastEpoch.epoch}, ${i}, ${this.PROVIDER_LIMIT}) returned null`,
          );
          continue;
        }

        history = history.concat(upstreamHistory);
      }

      for (let i = 0; i < history.length; i++) {
        const epoch = new Epoch();
        epoch.epoch = history[i].epoch;
        epoch.startTime = history[i].startTime;
        epoch.endTime = history[i].endTime;
        await this.em.save(epoch);
        this.logger.log(`Epoch Sync - Saving Epoch ${epoch.epoch}`);
      }

      const epoch = new Epoch();
      epoch.epoch = lastEpoch.epoch;
      epoch.startTime = lastEpoch.startTime;
      epoch.endTime = lastEpoch.endTime;
      lastStoredEpoch = await this.em.save(epoch);
      this.logger.log(`Epoch Sync - Saving Epoch ${epoch.epoch}`);
    }

    return lastStoredEpoch ? lastStoredEpoch : null;
  }
}
