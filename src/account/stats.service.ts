import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AccountHistoryRepository } from './repositories/account-history.repository';
import { UserAccountRepository } from './repositories/user-account.repository';
import { EpochRepository } from '../epoch/repositories/epoch.repository';
import { dateFromUnix, dateToUnix } from '../utils/utils';
import {
  MonthlyRewardsDto,
  MonthlyRewardsListDto,
} from './dto/stats/monthly-rewards.dto';

@Injectable()
export class StatsService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async perMonthRewards(
    userId: number,
    year: number,
    month: number,
  ): Promise<MonthlyRewardsListDto> {
    const fromDate = new Date(
      `${year}-${('0' + month).slice(-2)}-01T00:00:00.000Z`,
    );

    const fromEpoch = await this.em
      .getCustomRepository(EpochRepository)
      .findOneStartAfter(dateToUnix(fromDate));

    if (!fromEpoch)
      throw new NotFoundException(
        `Epoch not found for ${fromDate.toISOString()}`,
      );

    const userAccounts = await this.em
      .getCustomRepository(UserAccountRepository)
      .findAllUserAccount(userId);

    // const monthlyRewards = new Array(12).fill(0);
    const monthlyRewards: { [key: string]: MonthlyRewardsDto } = {};

    for (const userAccount of userAccounts) {
      const records = await this.em
        .getCustomRepository(AccountHistoryRepository)
        .findAccountHistory({
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
          monthlyRewards[key].rewards = monthlyRewards[key].rewards + rewards;
        } else {
          monthlyRewards[key] = new MonthlyRewardsDto({ month: key, rewards });
        }
      }
    }

    const data = Object.keys(monthlyRewards).map((key) => monthlyRewards[key]);
    data.sort((a, b) => (a.month < b.month ? -1 : 1));

    return new MonthlyRewardsListDto({
      from: fromDate.toISOString(),
      data: data,
    });
  }
}
