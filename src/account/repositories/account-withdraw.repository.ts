import { EntityRepository, Repository } from 'typeorm';
import { AccountWithdraw } from '../entities/account-withdraw.entity';

@EntityRepository(AccountWithdraw)
export class AccountWithdrawRepository extends Repository<AccountWithdraw> {}
