import { Injectable, NotFoundException } from '@nestjs/common';
import { EpochDto } from './dto/epoch.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { EpochRepository } from './repositories/epoch.repository';
import { HistoryParam } from '../utils/params/history.param';

@Injectable()
export class EpochService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async getLastEpoch(): Promise<EpochDto> {
    const lastEpoch = await this.em
      .getCustomRepository(EpochRepository)
      .findLastEpoch();

    if (!lastEpoch) {
      throw new NotFoundException('Last epoch not found.');
    }

    const epochDto = new EpochDto();
    epochDto.epoch = lastEpoch.epoch;
    epochDto.startTime = lastEpoch.startTime;
    epochDto.endTime = lastEpoch.endTime;

    return epochDto;
  }

  async getEpoch(epochNumber: number): Promise<EpochDto> {
    const epoch = await this.em
      .getCustomRepository(EpochRepository)
      .findOne({ epoch: epochNumber });

    if (!epoch) {
      throw new NotFoundException('Epoch not found.');
    }

    const epochDto = new EpochDto();
    epochDto.epoch = epoch.epoch;
    epochDto.startTime = epoch.startTime;
    epochDto.endTime = epoch.endTime;

    return epochDto;
  }

  async getHistory(query: HistoryParam): Promise<EpochDto[]> {
    const history = await this.em
      .getCustomRepository(EpochRepository)
      .findEpochHistory(query);

    return history.map((h) => {
      const dto = new EpochDto();

      dto.epoch = h.epoch;
      dto.startTime = h.startTime;
      dto.endTime = h.endTime;

      return dto;
    });
  }
}
