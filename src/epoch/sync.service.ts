import { Injectable } from '@nestjs/common';
import config from '../../sync-config.json';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Epoch } from './entities/epoch.entity';
import { EpochRepository } from './repositories/epoch.repository';
import { BlockfrostService } from '../utils/api/blockfrost.service';
import type { EpochType } from '../utils/api/types/epoch.type';

@Injectable()
export class SyncService {
  private readonly PROVIDER_LIMIT = config.provider.limit;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly source: BlockfrostService,
  ) {}

  async syncEpoch(): Promise<Epoch | null> {
    const lastEpoch = await this.source.lastEpoch();

    if (!lastEpoch) {
      console.log(
        `ERROR::EpochSync()->syncEpoch()->source.lastEpoch() returned null`,
      );
      return null;
    }

    const epochRepository = this.em.getCustomRepository(EpochRepository);
    let lastStoredEpoch = await epochRepository.findLastEpoch();

    if (!lastStoredEpoch || lastEpoch.epoch !== lastStoredEpoch.epoch) {
      // Last epoch synchronized separately, use -1 or use 208
      const epochToSync = lastStoredEpoch
        ? lastEpoch.epoch - lastStoredEpoch.epoch - 1
        : lastEpoch.epoch - 208;
      const pages = Math.ceil(epochToSync / this.PROVIDER_LIMIT);

      let history: EpochType[] = [];

      for (let i = pages; i >= 1; i--) {
        const limit =
          i === pages ? epochToSync % this.PROVIDER_LIMIT : this.PROVIDER_LIMIT;
        let upstreamHistory = await this.source.getEpochHistory(
          lastEpoch.epoch,
          i,
          this.PROVIDER_LIMIT,
        );

        if (!upstreamHistory) {
          console.log(
            `ERROR::EpochSync()->syncEpoch()
              ->this.source.getEpochHistory(${lastEpoch.epoch}, ${i}, ${this.PROVIDER_LIMIT}) returned null`,
          );
          continue;
        }

        upstreamHistory = upstreamHistory.slice(-limit);
        history = history.concat(upstreamHistory);
      }

      for (let i = 0; i < history.length; i++) {
        let epoch = new Epoch();
        epoch.epoch = history[i].epoch;
        epoch.startTime = history[i].startTime;
        epoch.endTime = history[i].endTime;
        epochRepository.save(epoch);
      }

      let epoch = new Epoch();
      epoch.epoch = lastEpoch.epoch;
      epoch.startTime = lastEpoch.startTime;
      epoch.endTime = lastEpoch.endTime;
      lastStoredEpoch = await epochRepository.save(epoch);
    }

    return lastStoredEpoch ? lastStoredEpoch : null;
  }
}
