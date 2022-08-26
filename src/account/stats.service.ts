import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { dateFromUnix, dateToUnix } from '../utils/utils';
import { MonthlyDto, MonthlyListDto } from './dto/stats/monthly.dto';
import { EpochService } from '../epoch/epoch.service';
import { UserAccountService } from './user-account.service';
import { AccountHistoryService } from './account-history.service';

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
}
