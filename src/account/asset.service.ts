import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Asset } from './entities/asset.entity';

@Injectable()
export class AssetService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  async exist(hexId: string): Promise<boolean> {
    const count = await this.em
      .getRepository(Asset)
      .createQueryBuilder('asset')
      .where('asset.hexId = :hexId', { hexId: hexId })
      .getCount();

    return count > 0;
  }
}
