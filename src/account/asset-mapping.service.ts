import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UserMapping } from './entities/user-mapping.entity';
import { AssetMapping } from './entities/asset-mapping.entity';
import { UserService } from '../user/user.service';
import { PageParam } from '../utils/params/page.param';
import {
  UserMappingDto,
  UserMappingListDto,
} from './dto/asset/user-mapping.dto';
import config from '../../config.json';
import { hexToString } from '@blockfrost/blockfrost-js/lib/utils/helpers';
import { ToggleMappingDto } from './dto/asset/toggle-mapping.dto';
import {
  AssetMappingDto,
  AssetMappingListDto,
} from './dto/asset/asset-mapping.dto';
import { MappingRequestDto } from './dto/asset/mapping-request.dto';
import { TxSyncService } from './sync/tx-sync.service';
import { Asset } from './entities/asset.entity';

@Injectable()
export class AssetMappingService {
  private readonly MAX_LIMIT = config.api.pageLimit;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly userService: UserService,
    @Inject(forwardRef(() => TxSyncService))
    private readonly txSyncService: TxSyncService,
  ) {}

  async getUserMapping(
    userId: number,
    params: PageParam,
    search?: string,
  ): Promise<UserMappingListDto> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const mapping = await this.findUserMappingPage(userId, params, search);

    const assetIds = mapping[0].map((m) => m.asset.id);

    const globalMapping = assetIds.length
      ? await this.findMappingSelection(assetIds)
      : [];

    return new UserMappingListDto({
      count: mapping[1],
      data: mapping[0].map((m) => {
        const global = globalMapping.find((gm) => gm.asset.id === m.asset.id);
        return new UserMappingDto({
          name: hexToString(m.asset.name),
          hexId: m.asset.hexId,
          fingerprint: m.asset.fingerprint,
          userKoinlyId: m.koinlyId,
          koinlyId: global && global.activeKoinlyId ? global.koinlyId : '',
          useGlobalKoinlyId: m.useGlobalKoinlyId,
        });
      }),
    });
  }

  async toggleMappingOptions(
    userId: number,
    params: ToggleMappingDto,
  ): Promise<boolean> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const mapping = await this.findUserMappingByFingerprint(
      userId,
      params.fingerprint,
    );

    if (!mapping) {
      throw new NotFoundException('User mapping not found.');
    }

    if (params.useGlobalKoinlyId !== undefined) {
      mapping.useGlobalKoinlyId = params.useGlobalKoinlyId;
    }

    await this.em.save(mapping);

    return true;
  }

  async createMappingRequest(
    mappingRequest: MappingRequestDto,
  ): Promise<boolean> {
    let mapping = await this.findMapping(mappingRequest.hexId);

    if (!mapping) {
      let asset = await this.em
        .getRepository(Asset)
        .findOne({ where: { hexId: mappingRequest.hexId } });

      if (!asset) {
        await this.txSyncService.syncAsset(mappingRequest.hexId);
        asset = await this.em
          .getRepository(Asset)
          .findOne({ where: { hexId: mappingRequest.hexId } });

        if (!asset)
          throw new NotFoundException(
            `Asset ${mappingRequest.hexId} not found.`,
          );
      }

      mapping = new AssetMapping();
      mapping.asset = asset;
    }

    // Handle Koinly ID
    if (mappingRequest.koinlyId && mappingRequest.koinlyId.length) {
      if (mapping.activeKoinlyId)
        throw new ConflictException(
          'Koinly mapping already exist for requested asset.',
        );

      const koinlyMapping = await this.em
        .getRepository(AssetMapping)
        .findOne({ where: { koinlyId: mappingRequest.koinlyId } });

      if (koinlyMapping)
        throw new ConflictException('Koinly ID used by another record.');

      mapping.koinlyId = mappingRequest.koinlyId;
      mapping.activeKoinlyId = false;
    }

    await this.em.save(mapping);

    return true;
  }

  async getGlobalMapping(
    params: PageParam,
    search?: string,
  ): Promise<AssetMappingListDto> {
    const mapping = await this.findMappingPage(params, search);

    return new AssetMappingListDto({
      count: mapping[1],
      data: mapping[0].map(
        (m) =>
          new AssetMappingDto({
            name: hexToString(m.asset.name),
            hexId: m.asset.hexId,
            fingerprint: m.asset.fingerprint,
            koinlyId: m.koinlyId,
            activeKoinlyId: m.activeKoinlyId,
          }),
      ),
    });
  }

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

  async findUserMappingByFingerprint(
    userId: number,
    fingerprint: string,
  ): Promise<UserMapping | null> {
    return this.em
      .getRepository(UserMapping)
      .createQueryBuilder('mapping')
      .innerJoin('mapping.asset', 'asset')
      .innerJoin('mapping.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('asset.fingerprint = :fingerprint', { fingerprint })
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

  async findMappingByFingerprint(
    fingerprint: string,
  ): Promise<AssetMapping | null> {
    return this.em
      .getRepository(AssetMapping)
      .createQueryBuilder('mapping')
      .innerJoin('mapping.asset', 'asset')
      .where('asset.fingerprint = :fingerprint', { fingerprint })
      .getOne();
  }

  async findMappingSelection(assetIds: number[]): Promise<AssetMapping[]> {
    return this.em
      .getRepository(AssetMapping)
      .createQueryBuilder('mapping')
      .innerJoinAndSelect('mapping.asset', 'asset')
      .where('asset.id IN (:...assetIds)', { assetIds })
      .getMany();
  }

  async findMappingPage(
    params: PageParam,
    search?: string,
  ): Promise<[AssetMapping[], number]> {
    const qb = this.em
      .getRepository(AssetMapping)
      .createQueryBuilder('mapping')
      .innerJoinAndSelect('mapping.asset', 'asset')
      .orderBy('mapping.id', 'ASC');

    if (search && search.length) {
      const hexSearch = Buffer.from(search, 'utf-8').toString('hex');
      qb.where(
        'asset.fingerprint LIKE :start OR mapping.koinlyId LIKE :contain OR asset.name LIKE :containHex OR asset.hexId LIKE :contain',
        {
          start: `${search}%`,
          contain: `%${search}%`,
          containHex: `%${hexSearch}%`,
        },
      );
    }

    qb.take(params.limit ? params.limit : this.MAX_LIMIT);

    if (params.page) {
      qb.skip(
        (params.page - 1) * (params.limit ? params.limit : this.MAX_LIMIT),
      );
    }

    return qb.getManyAndCount();
  }

  async findUserMappingPage(
    userId: number,
    params: PageParam,
    search?: string,
  ): Promise<[UserMapping[], number]> {
    const qb = this.em
      .getRepository(UserMapping)
      .createQueryBuilder('mapping')
      .innerJoinAndSelect('mapping.asset', 'asset')
      .innerJoin('mapping.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('mapping.id', 'ASC');

    if (search && search.length) {
      const hexSearch = Buffer.from(search, 'utf-8').toString('hex');
      qb.where(
        'asset.fingerprint LIKE :start OR mapping.koinlyId LIKE :contain OR asset.name LIKE :containHex OR asset.hexId LIKE :contain',
        {
          start: `${search}%`,
          contain: `%${search}%`,
          containHex: `%${hexSearch}%`,
        },
      );
    }

    qb.take(params.limit ? params.limit : this.MAX_LIMIT);

    if (params.page) {
      qb.skip(
        (params.page - 1) * (params.limit ? params.limit : this.MAX_LIMIT),
      );
    }

    return qb.getManyAndCount();
  }
}
