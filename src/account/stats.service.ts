import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { dateFromUnix, dateToUnix } from '../utils/utils';
import { MonthlyDto, MonthlyListDto } from './dto/stats/monthly.dto';
import { EpochService } from '../epoch/epoch.service';
import { UserAccountService } from './user-account.service';
import { AccountHistoryService } from './account-history.service';
import { PoolROSDto } from './dto/stats/pool-ros.dto';
import { FromParam } from '../utils/params/from.param';

@Injectable()
export class StatsService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly epochService: EpochService,
    private readonly userAccountService: UserAccountService,
    private readonly accountHistoryService: AccountHistoryService,
  ) {}

  async perMonthRewards(
    userId: number,
    year: number,
    month: number,
  ): Promise<MonthlyListDto> {
    const fromDate = new Date(
      `${year}-${('0' + month).slice(-2)}-01T00:00:00.000Z`,
    );

    const fromEpoch = await this.epochService.findOneStartAfter(
      dateToUnix(fromDate),
    );

    if (!fromEpoch)
      throw new NotFoundException(
        `Epoch not found for ${fromDate.toISOString()}`,
      );

    const userAccounts = await this.userAccountService.findAllUserAccount(
      userId,
    );

    const monthlyRewards: { [key: string]: MonthlyDto } = {};

    for (const userAccount of userAccounts) {
      const records = await this.accountHistoryService.findAccountHistory({
        stakeAddress: userAccount.account.stakeAddress,
        from: fromEpoch.epoch,
        order: 'ASC',
      });

      for (const record of records[0]) {
        const startTime = new Date(dateFromUnix(record.epoch.startTime));
        const key = `${startTime.getUTCFullYear()}-${(
          '0' + (startTime.getUTCMonth() + 1).toString()
        ).slice(-2)}`;
        const rewards =
          record.revisedRewards > 0
            ? record.revisedRewards + record.opRewards
            : record.rewards;
        if (monthlyRewards[key]) {
          monthlyRewards[key].value = monthlyRewards[key].value + rewards;
        } else {
          monthlyRewards[key] = new MonthlyDto({ month: key, value: rewards });
        }
      }
    }

    const data = Object.keys(monthlyRewards).map((key) => monthlyRewards[key]);
    data.sort((a, b) => (a.month < b.month ? -1 : 1));

    return new MonthlyListDto({
      from: fromDate.toISOString(),
      data: data,
    });
  }

  async perMonthStake(
    userId: number,
    year: number,
    month: number,
  ): Promise<MonthlyListDto> {
    const fromDate = new Date(
      `${year}-${('0' + month).slice(-2)}-01T00:00:00.000Z`,
    );

    const fromEpoch = await this.epochService.findOneStartAfter(
      dateToUnix(fromDate),
    );

    if (!fromEpoch)
      throw new NotFoundException(
        `Epoch not found for ${fromDate.toISOString()}`,
      );

    const userAccounts = await this.userAccountService.findAllUserAccount(
      userId,
    );

    const monthlyStake: { [key: string]: MonthlyDto } = {};

    for (const userAccount of userAccounts) {
      const records = await this.accountHistoryService.findAccountHistory({
        stakeAddress: userAccount.account.stakeAddress,
        from: fromEpoch.epoch,
        order: 'ASC',
      });

      const monthlyAccountStake: { [key: string]: MonthlyDto } = {};
      const monthlyCount: { [key: string]: number } = {};

      for (const record of records[0]) {
        const startTime = new Date(dateFromUnix(record.epoch.startTime));
        const key = `${startTime.getUTCFullYear()}-${(
          '0' + (startTime.getUTCMonth() + 1).toString()
        ).slice(-2)}`;
        if (monthlyAccountStake[key]) {
          monthlyCount[key]++;
          monthlyAccountStake[key].value =
            monthlyAccountStake[key].value + record.activeStake;
        } else {
          monthlyCount[key] = 1;
          monthlyAccountStake[key] = new MonthlyDto({
            month: key,
            value: record.activeStake,
          });
        }
      }

      for (const key in monthlyAccountStake) {
        // Calculate monthly average
        monthlyAccountStake[key].value = Math.floor(
          monthlyAccountStake[key].value / monthlyCount[key],
        );
        // Add current account monthly average to monthly total
        if (monthlyStake[key]) {
          monthlyStake[key].value =
            monthlyStake[key].value + monthlyAccountStake[key].value;
        } else {
          monthlyStake[key] = monthlyAccountStake[key];
        }
      }
    }

    const data = Object.keys(monthlyStake).map((key) => monthlyStake[key]);
    data.sort((a, b) => (a.month < b.month ? -1 : 1));

    return new MonthlyListDto({
      from: fromDate.toISOString(),
      data: data,
    });
  }

  async poolsROS(userId: number, params: FromParam): Promise<PoolROSDto[]> {
    const userAccounts = await this.userAccountService.findAllUserAccount(
      userId,
    );

    if (!userAccounts.length) return [];

    const flatAccountsList = userAccounts.map(
      (userAccount) => userAccount.account.stakeAddress,
    );

    const accountsHistory =
      await this.accountHistoryService.findAccountHistorySelection(
        flatAccountsList,
        params,
      );

    if (!accountsHistory.length) return [];

    // Reverse to get most recent pool name first
    accountsHistory[0].reverse();

    const poolsEpochsROS: {
      [key: string]: { name: string; epochsROS: number[]; epochsROO: number[] };
    } = {};

    for (const history of accountsHistory[0]) {
      if (!history.pool) continue;

      if (!poolsEpochsROS[history.pool.poolId]) {
        poolsEpochsROS[history.pool.poolId] = {
          name: history.pool.name,
          epochsROS: [],
          epochsROO: [],
        };
      }

      const activeStakeRecord = accountsHistory[0].find(
        (h) =>
          h.epoch.epoch === history.epoch.epoch - 2 &&
          h.account.stakeAddress == history.account.stakeAddress,
      );

      if (activeStakeRecord) {
        const rewards = history.revisedRewards
          ? history.revisedRewards
          : history.rewards;

        poolsEpochsROS[history.pool.poolId].epochsROS.push(
          (rewards / activeStakeRecord.activeStake) * 73,
        );
        if (history.owner) {
          poolsEpochsROS[history.pool.poolId].epochsROO.push(
            (history.opRewards / activeStakeRecord.activeStake) * 73,
          );
        }
      }
    }

    const poolsROS: PoolROSDto[] = [];

    for (const poolId in poolsEpochsROS) {
      const pool = poolsEpochsROS[poolId];

      const ros = pool.epochsROS.length
        ? pool.epochsROS.reduce((a, b) => a + b) / pool.epochsROS.length
        : 0;

      const roo = pool.epochsROO.length
        ? pool.epochsROO.reduce((a, b) => a + b) / pool.epochsROO.length
        : 0;

      poolsROS.push(new PoolROSDto({ poolName: pool.name, poolId, ros, roo }));
    }

    return poolsROS;
  }
}
