import { EntityRepository, Repository } from 'typeorm';
import { Epoch } from '../entities/epoch.entity';

@EntityRepository(Epoch)
export class EpochRepository extends Repository<Epoch> {
  async findLastEpoch(): Promise<Epoch | undefined> {
    return this.createQueryBuilder('epoch')
      .orderBy('epoch.epoch', 'DESC')
      .limit(1)
      .getOne();
  }
}
