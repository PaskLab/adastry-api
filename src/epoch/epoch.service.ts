import { Injectable, NotFoundException } from '@nestjs/common';
import { EpochDto, EpochListDto } from './dto/epoch.dto';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { HistoryParam } from '../utils/params/history.param';
import config from '../../config.json';
import { Epoch } from './entities/epoch.entity';

@Injectable()
export class EpochService {
  private readonly MAX_LIMIT = config.api.pageLimit;

  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async getLastEpoch(): Promise<EpochDto> {
    const lastEpoch = await this.findLastEpoch();

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
      .getRepository(Epoch)
      .findOne({ where: { epoch: epochNumber } });

    if (!epoch) {
      throw new NotFoundException('Epoch not found.');
    }

    const epochDto = new EpochDto();
    epochDto.epoch = epoch.epoch;
    epochDto.startTime = epoch.startTime;
    epochDto.endTime = epoch.endTime;

    return epochDto;
  }

  async getHistory(query: HistoryParam): Promise<EpochListDto> {
    const history = await this.findEpochHistory(query);

    return new EpochListDto({
      count: history[1],
      data: history[0].map((h) => {
        const dto = new EpochDto();

        dto.epoch = h.epoch;
        dto.startTime = h.startTime;
        dto.endTime = h.endTime;

        return dto;
      }),
    });
  }

  // REPOSITORY

  async findLastEpoch(): Promise<Epoch | null> {
    return this.em
      .getRepository(Epoch)
      .createQueryBuilder('epoch')
      .orderBy('epoch.epoch', 'DESC')
      .limit(1)
      .getOne();
  }

  async findEpochHistory(params: HistoryParam): Promise<[Epoch[], number]> {
    const qb = this.em.getRepository(Epoch).createQueryBuilder('epoch');

    if (params.order) {
      qb.orderBy('epoch.epoch', params.order);
    } else {
      qb.orderBy('epoch.epoch', 'DESC');
    }

    if (params.limit) {
      qb.take(params.limit);
    } else {
      qb.take(this.MAX_LIMIT);
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

  async findOneFromTime(time: number): Promise<Epoch | null> {
    return this.em
      .getRepository(Epoch)
      .createQueryBuilder('epoch')
      .where('epoch.startTime <= :time')
      .andWhere('epoch.endTime >= :time')
      .setParameter('time', time)
      .getOne();
  }

  async findOneStartAfter(time: number): Promise<Epoch | null> {
    return this.em
      .getRepository(Epoch)
      .createQueryBuilder('epoch')
      .where('epoch.startTime >= :time')
      .andWhere('epoch.endTime >= :time')
      .setParameter('time', time)
      .getOne();
  }
}
