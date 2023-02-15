import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UserMapping } from './entities/user-mapping.entity';
import { AssetMapping } from './entities/asset-mapping.entity';

@Injectable()
export class AssetMappingService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // REPOSITORY

  async findUserMapping(
    userId: number,
    hexId: string,
  ): Promise<UserMapping | null> {
    return this.em
      .getRepository(UserMapping)
      .createQueryBuilder('mapping')
      .innerJoin('mapping.asset', 'asset')
      .innerJoin('mapping.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('asset.hexId = :hexId', { hexId })
      .getOne();
  }

  async findUserNextKoinlyId(userId: number, prefix: string): Promise<string> {
    const count = await this.em
      .getRepository(UserMapping)
      .createQueryBuilder('mapping')
      .where('mapping.koinlyId LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();

    return `${prefix}${count + 1}`;
  }

  async findMapping(hexId: string): Promise<AssetMapping | null> {
    return this.em
      .getRepository(AssetMapping)
      .createQueryBuilder('mapping')
      .innerJoin('mapping.asset', 'asset')
      .where('asset.hexId = :hexId', { hexId })
      .getOne();
  }
}
