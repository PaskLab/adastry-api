import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Account } from './entities/account.entity';
import { AccountHistoryQueryType } from './types/account-history-query.type';
import { AccountHistoryDto, HistorySpotDto } from './dto/account-history.dto';
import { SyncService } from './sync.service';
import { Request } from 'express';
import { CsvFileDto } from './dto/csv-file.dto';
import {
  createTimestamp,
  dateFromUnix,
  generateUrl,
  roundTo,
  toAda,
} from '../utils/utils';
import crypto from 'crypto';
import { CsvFieldsType } from './types/csv-fields.type';
import { CsvService } from './csv.service';
import { PoolDto } from '../pool/dto/pool.dto';
import { AccountHistoryListDto } from './dto/account-history.dto';
import { EpochDto } from '../epoch/dto/epoch.dto';
import { SpotService } from '../spot/spot.service';
import { SpotListDto } from '../spot/dto/spot.dto';
import { UserService } from '../user/user.service';
import { EpochService } from '../epoch/epoch.service';
import { RateService } from '../spot/rate.service';
import { AccountHistoryService } from './account-history.service';
import { CsvFileInfoType } from './types/csv-file-info.type';
import { AccountHistory } from './entities/account-history.entity';

@Injectable()
export class AccountService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly accountHistoryService: AccountHistoryService,
    private readonly syncService: SyncService,
    private readonly csvService: CsvService,
    private readonly spotService: SpotService,
    private readonly userService: UserService,
    private readonly epochService: EpochService,
    private readonly rateService: RateService,
  ) {}

  async create(stakeAddress: string): Promise<Account> {
    let account = await this.em
      .getRepository(Account)
      .findOne({ where: { stakeAddress: stakeAddress } });

    if (account) {
      throw new ConflictException('Stake account already exist.');
    }

    account = new Account();
    account.stakeAddress = stakeAddress;

    account = await this.em.save(account);

    const lastEpoch = await this.epochService.findLastEpoch();

    if (lastEpoch) {
      this.syncService.syncAccount(account, lastEpoch).then();
    }

    return account;
  }

  async remove(stakeAddress: string): Promise<void> {
    const account = await this.em
      .getRepository(Account)
      .findOne({ where: { stakeAddress: stakeAddress } });

    if (!account) {
      throw new NotFoundException(`Account ${stakeAddress} not found.`);
    }

    try {
      await this.em.remove(account);
    } catch (e) {
      throw new ConflictException(`Account ${stakeAddress} cannot be deleted.`);
    }
  }

  async getHistory(
    userId: number,
    params: AccountHistoryQueryType,
  ): Promise<AccountHistoryListDto> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const history = await this.accountHistoryService.findAccountHistory(params);

    let priceHistory: SpotListDto;

    if (history[0].length) {
      priceHistory = await this.spotService.getPriceHistory(
        {
          from: history[0][0].epoch.epoch,
          limit: params.limit,
          order: params.order,
        },
        user.currency.code,
      );
    }

    return new AccountHistoryListDto({
      count: history[1],
      data: history[0].map((h) => {
        const spotPrice = priceHistory.data.find(
          (price) => price.epoch === h.epoch.epoch,
        );

        return new AccountHistoryDto({
          account: h.account.stakeAddress,
          epoch: new EpochDto({
            epoch: h.epoch.epoch,
            startTime: h.epoch.startTime,
            endTime: h.epoch.endTime,
          }),
          activeStake: h.activeStake,
          balance: h.balance,
          rewards: h.rewards,
          mir: h.mir,
          revisedRewards: h.revisedRewards,
          opRewards: h.opRewards,
          withdrawable: h.withdrawable,
          withdrawn: h.withdrawn,
          pool: h.pool
            ? new PoolDto({
                poolId: h.pool.poolId,
                name: h.pool.name,
                blocksMinted: h.pool.blocksMinted,
                liveStake: h.pool.liveStake,
                liveSaturation: h.pool.liveSaturation,
                liveDelegators: h.pool.liveDelegators,
                epoch: h.pool.epoch ? h.pool.epoch.epoch : null,
                isMember: h.pool.isMember,
              })
            : null,
          owner: h.owner,
          stakeShare: h.stakeShare,
          spotPrice: new HistorySpotDto({
            code: user.currency.code,
            price: spotPrice ? spotPrice.price : 0,
          }),
        });
      }),
    });
  }

  async loyaltyCheck(stakeAddress: string, minScore: number): Promise<boolean> {
    const account = await this.em
      .getRepository(Account)
      .findOne({ where: { stakeAddress: stakeAddress } });

    if (!account) {
      throw new NotFoundException(`Account ${stakeAddress} not found.`);
    }

    return account.loyalty >= minScore;
  }

  async getRewardsCSV(
    request: Request,
    userId: number,
    stakeAddress: string,
    year: number,
    format?: string,
    quarter?: number,
  ): Promise<CsvFileDto> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const history = await this.accountHistoryService.findByYear(
      stakeAddress,
      year,
      quarter,
    );

    if (!history.length) {
      throw new NotFoundException(
        `No reward history found for ${stakeAddress} in year ${year}`,
      );
    }

    const baseCurrency = user.currency ? user.currency.code : 'USD';

    const filename = `${year}${
      quarter ? '-Q' + quarter : ''
    }-rewards-${stakeAddress.slice(0, 15)}-${format ? format : 'default'}.csv`;

    const fileInfo = await this.generateRewardCSV(
      filename,
      history,
      baseCurrency,
      format,
    );

    return new CsvFileDto({
      filename: filename,
      fileExpireAt: fileInfo.expireAt.toUTCString(),
      url: generateUrl(request, 'public/tmp', filename),
      format: format ? format : 'default',
      stakeAddress: stakeAddress,
      year: year.toString(),
    });
  }

  private async getNetWorth(
    amount: number,
    baseCurrency: string,
    epoch: number,
  ): Promise<number> {
    const spotPrice = await this.spotService.findEpoch(epoch);
    const baseCurrencyRate = await this.rateService.findRateEpoch(
      baseCurrency,
      epoch,
    );

    let netWorthAmount = 0;

    if (spotPrice && baseCurrencyRate) {
      netWorthAmount = amount * spotPrice.price * baseCurrencyRate.rate;
      netWorthAmount = roundTo(netWorthAmount, 2);
    }

    return netWorthAmount;
  }

  async generateRewardCSV(
    filename: string,
    history: AccountHistory[],
    baseCurrency: string,
    format?: string,
  ): Promise<CsvFileInfoType> {
    const data: CsvFieldsType[] = [];

    for (const record of history) {
      if (
        record.rewards < 1 &&
        record.mir < 1 &&
        record.revisedRewards < 1 &&
        record.opRewards < 1
      )
        continue;

      const calculatedRewards =
        record.revisedRewards || record.opRewards
          ? record.revisedRewards + record.opRewards
          : record.rewards;

      const receivedAmount =
        record.revisedRewards || record.opRewards
          ? record.revisedRewards + record.opRewards + record.mir
          : record.rewards + record.mir;

      const netWorthAmount = await this.getNetWorth(
        toAda(receivedAmount),
        baseCurrency,
        record.epoch.epoch,
      );

      const row = {
        date: createTimestamp(dateFromUnix(record.epoch.startTime)),
        sentAmount: '',
        sentCurrency: '',
        receivedAmount: toAda(receivedAmount),
        receivedCurrency: 'ADA',
        feeAmount: '',
        feeCurrency: '',
        netWorthAmount: netWorthAmount ? netWorthAmount : '',
        netWorthCurrency: baseCurrency,
        label: 'reward',
        description: `Epoch ${record.epoch.epoch} for ${record.account.stakeAddress}`,
        txHash: crypto
          .createHash('sha256')
          .update(record.epoch.epoch + record.account.stakeAddress)
          .digest('hex'),
        accountBalance: toAda(record.balance),
        realRewards: toAda(record.rewards),
        calculatedRewards: toAda(calculatedRewards),
        mirRewards: toAda(record.mir),
        revisedRewards: toAda(record.revisedRewards),
        opRewards: toAda(record.opRewards),
        stakeShare: record.stakeShare,
        withdrawable: toAda(record.withdrawable),
        withdrawn: toAda(record.withdrawn),
        activeStake: toAda(record.activeStake),
        epoch: record.epoch.epoch,
      };
      data.push(row);
    }

    let fileInfo;

    switch (format) {
      case 'transaction':
        fileInfo = await this.csvService.writeTransactionCSV(filename, data);
        break;
      case 'koinly':
        fileInfo = await this.csvService.writeKoinlyCSV(filename, data);
        break;
      case 'spo':
        fileInfo = await this.csvService.writeSpoCSV(filename, data);
        break;
      case 'multiowner':
        fileInfo = await this.csvService.writeMultiOwnerCSV(filename, data);
        break;
      default:
        fileInfo = await this.csvService.writeHistoryCSV(filename, data);
    }

    return fileInfo;
  }

  // CUSTOM REPOSITORY

  async findAll(): Promise<Account[]> {
    return this.em
      .getRepository(Account)
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.epoch', 'epoch')
      .leftJoinAndSelect('account.pool', 'pool')
      .getMany();
  }

  async findOneWithJoin(stakeAddress: string): Promise<Account | null> {
    return this.em
      .getRepository(Account)
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.epoch', 'epoch')
      .leftJoinAndSelect('account.pool', 'pool')
      .leftJoinAndSelect('pool.epoch', 'poolEpoch')
      .where('account.stakeAddress = :stakeAddress')
      .setParameter('stakeAddress', stakeAddress)
      .getOne();
  }
}
