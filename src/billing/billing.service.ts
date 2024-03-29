import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { AccountStateDto } from './dto/account-state.dto';
import { InvoiceAccount } from './entities/invoice-account.entity';
import { InvoicePool } from './entities/invoice-pool.entity';
import { UserAccountService } from '../account/user-account.service';
import config from '../../config.json';
import { NewInvoiceDto } from './dto/new-invoice.dto';
import { User } from '../user/entities/user.entity';
import { Account } from '../account/entities/account.entity';
import { Pool } from '../pool/entities/pool.entity';
import { Invoice } from './entities/invoice.entity';
import { InvoiceDto, InvoiceListDto } from './dto/invoice.dto';
import { BlockfrostService } from '../utils/api/blockfrost.service';
import { Cron } from '@nestjs/schedule';
import { UserAccount } from '../account/entities/user-account.entity';
import process from 'process';
import { request as apiRequest } from '../utils/api/api.helper';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly MIN_LOYALTY = config.app.minLoyalty;
  private readonly BILLING_CONFIG = config.app.billing;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    @Inject(forwardRef(() => UserAccountService))
    private readonly userAccountService: UserAccountService,
    private readonly source: BlockfrostService,
  ) {}

  async createInvoice(
    userId: number,
    newInvoice: NewInvoiceDto,
  ): Promise<Invoice> {
    const user = await this.em
      .getRepository(User)
      .findOne({ where: { id: userId, active: true } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!newInvoice.accounts.length && !newInvoice.pools.length) {
      throw new BadRequestException('Must contain at least 1 product.');
    }

    // Prevent duplicate payment for a same account
    if (newInvoice.accounts.length) {
      const accountsInvoices = await this.findActiveAccounts(
        newInvoice.accounts,
        true,
      );
      if (accountsInvoices.length)
        throw new ConflictException(
          'Active or Pending subscription already exist for at least one of the selected account(s).',
        );
    }

    // Prevent duplicate payment for a same pool
    if (newInvoice.pools.length) {
      const poolsInvoices = await this.findActivePools(newInvoice.pools, true);
      if (poolsInvoices.length)
        throw new ConflictException(
          'Active or Pending subscription already exist for at least one of the selected pool(s).',
        );
    }

    const accounts: Account[] = [];

    for (const stakeAddress of newInvoice.accounts) {
      const account = await this.em
        .getRepository(Account)
        .findOne({ where: { stakeAddress } });

      if (!account) {
        throw new NotFoundException(`${stakeAddress} not found.`);
      }

      accounts.push(account);
    }

    const pools: Pool[] = [];

    for (const poolId of newInvoice.pools) {
      const pool = await this.em
        .getRepository(Pool)
        .findOne({ where: { poolId } });

      if (!pool) {
        throw new NotFoundException(`${poolId} not found.`);
      }

      pools.push(pool);
    }

    if (!process.env.SUBMIT_API_URL) {
      throw new InternalServerErrorException('Submit API URL not set.');
    }

    let txHash = '';

    try {
      txHash = await apiRequest(
        process.env.SUBMIT_API_URL,
        '',
        { 'Content-Type': 'application/cbor' },
        Uint8Array.from(Buffer.from(newInvoice.txBody, 'hex')),
      );
    } catch (e) {
      throw new ServiceUnavailableException(
        'Failed to submit payment. Please try again later or contact support.',
      );
    }

    const totalAmount =
      newInvoice.accounts.length * this.BILLING_CONFIG.accountUnitPrice +
      newInvoice.pools.length * this.BILLING_CONFIG.poolUnitPrice;

    let invoice = new Invoice();
    invoice.invoiceId = newInvoice.invoiceId;
    invoice.txHash = txHash.length === 64 ? txHash : newInvoice.txHash;
    invoice.user = user;
    invoice.createdAt = new Date().valueOf().toString();
    invoice.totalAmount = totalAmount;
    invoice.confirmed = false;
    invoice.confirmedAt = '';
    invoice.accounts = accounts.map((a) => {
      const ia = new InvoiceAccount();
      ia.invoice = invoice;
      ia.account = a;
      ia.unitPrice = this.BILLING_CONFIG.accountUnitPrice;
      return ia;
    });
    invoice.pools = pools.map((p) => {
      const ip = new InvoicePool();
      ip.invoice = invoice;
      ip.pool = p;
      ip.unitPrice = this.BILLING_CONFIG.poolUnitPrice;
      return ip;
    });
    invoice.note = txHash.length === 64 ? '' : 'SUBMIT ERROR: ' + txHash;

    invoice = await this.em.save(invoice);

    // Invoice saved to monitor transaction. Error thrown to notify user of issue.
    if (txHash.length !== 64) {
      throw new InternalServerErrorException(
        'Failed to submit payment. Please try again later or contact support.',
      );
    }

    return invoice;
  }

  private plansSelector(
    userAccount: UserAccount,
    activeIAccounts: InvoiceAccount[],
    activeIPools: InvoicePool[],
  ): AccountStateDto {
    const accountState = new AccountStateDto({
      stakeAddress: userAccount.account.stakeAddress,
      name: userAccount.name,
      active: false,
      pending: false,
      type: 'none',
      invoiceId: '',
      createdAt: '',
      confirmedAt: '',
    });

    // Check if paid account
    const iAccount = activeIAccounts.findIndex(
      (ia) => ia.account.stakeAddress === userAccount.account.stakeAddress,
    );
    if (iAccount >= 0) {
      accountState.active = activeIAccounts[iAccount].invoice.confirmed;
      accountState.pending = !activeIAccounts[iAccount].invoice.confirmed;
      accountState.type = 'account';
      accountState.invoiceId = activeIAccounts[iAccount].invoice.invoiceId;
      accountState.createdAt = activeIAccounts[iAccount].invoice.createdAt;
      accountState.confirmedAt = activeIAccounts[iAccount].invoice.confirmedAt;
    }

    // Check if paid pool
    const iPool = activeIPools.findIndex(
      (ip) => ip.pool.poolId === userAccount.account.pool?.poolId,
    );
    if (iPool >= 0) {
      accountState.active = activeIPools[iPool].invoice.confirmed;
      accountState.pending = !activeIPools[iPool].invoice.confirmed;
      accountState.type = 'pool';
      accountState.invoiceId = activeIPools[iPool].invoice.invoiceId;
      accountState.createdAt = activeIPools[iPool].invoice.createdAt;
      accountState.confirmedAt = activeIPools[iPool].invoice.confirmedAt;
    }

    // Check if loyal to Armada Alliance
    if (userAccount.account.loyalty >= this.MIN_LOYALTY) {
      accountState.active = true;
      accountState.type = 'member';
    }

    return accountState;
  }

  async getAllUserAccountsState(userId: number): Promise<AccountStateDto[]> {
    const userAccounts = await this.userAccountService.findAllUserAccount(
      userId,
    );

    if (!userAccounts.length) return [];

    const stakeAddresses = userAccounts.map((ua) => ua.account.stakeAddress);
    const poolIds = [
      ...new Set([
        ...userAccounts
          .filter((ua) => ua.account.pool)
          .map((ua) => ua.account.pool!.poolId),
      ]),
    ];

    const activeInvoiceAccounts = await this.findActiveAccounts(
      stakeAddresses,
      true,
    );
    const activeInvoicePools = poolIds.length
      ? await this.findActivePools(poolIds, true)
      : [];

    const activeAccounts: AccountStateDto[] = [];

    for (const account of userAccounts) {
      activeAccounts.push(
        this.plansSelector(account, activeInvoiceAccounts, activeInvoicePools),
      );
    }

    return activeAccounts;
  }

  async getUserAccountState(
    userId: number,
    stakeAddress: string,
  ): Promise<AccountStateDto> {
    const userAccount = await this.userAccountService.findUserAccount(
      userId,
      stakeAddress,
    );

    if (!userAccount) {
      throw new NotFoundException('User account not found.');
    }

    const activeInvoiceAccounts = await this.findActiveAccounts(
      [stakeAddress],
      true,
    );
    const activeInvoicePools = await this.findActivePools(
      [userAccount.account.pool ? userAccount.account.pool.poolId : ''],
      true,
    );

    return this.plansSelector(
      userAccount,
      activeInvoiceAccounts,
      activeInvoicePools,
    );
  }

  async getUserInvoices(userId: number): Promise<InvoiceListDto> {
    const invoices = await this.findUserInvoices(userId);

    return new InvoiceListDto({
      count: invoices.length,
      data: invoices.map(
        (i) =>
          new InvoiceDto({
            invoiceId: i.invoiceId,
            txHash: i.txHash,
            totalAmount: i.totalAmount,
            confirmed: i.confirmed,
            canceled: i.canceled,
            confirmedAt: i.confirmedAt,
            createdAt: i.createdAt,
            accounts: i.accounts.map((ia) => ia.account.stakeAddress),
            pools: i.pools.map((ip) => ip.pool.poolId),
            note: i.note,
          }),
      ),
    });
  }

  @Cron('0 */5 * * * *', {
    name: 'Invoices Validation',
    timeZone: 'America/Toronto',
  })
  private async confirmInvoices(): Promise<void> {
    // 2 hours ago
    const dateLimit = new Date();
    dateLimit.setHours(dateLimit.getHours() - 2);

    const invoices = await this.em
      .getRepository(Invoice)
      .find({ where: { confirmed: false, canceled: false } });

    for (const invoice of invoices) {
      const bufferTime = new Date();
      bufferTime.setMinutes(bufferTime.getMinutes() - 3);

      if (parseInt(invoice.createdAt, 10) > bufferTime.valueOf()) {
        // If the transaction is too recent, wait 5 more minutes
        continue;
      }

      if (parseInt(invoice.createdAt, 10) < dateLimit.valueOf()) {
        invoice.canceled = true;
        await this.em.save(invoice);
        continue;
      }

      const txUtxos = await this.source.getTransactionUTxOs(invoice.txHash);

      if (!txUtxos) {
        this.logger.warn(
          `Invoices: Could not confirm invoice ${invoice.invoiceId}, retry in 5 minutes...`,
        );
        continue;
      }

      // Validate account
      const outputIndex = txUtxos.outputs.findIndex(
        (output) => output.address === this.BILLING_CONFIG.paymentAddress,
      );

      if (outputIndex < 0) {
        invoice.canceled = true;
        await this.em.save(invoice);
        continue;
      }

      // Validate amount
      const amount = txUtxos.outputs[outputIndex].amount.find(
        (a) => a.unit === 'lovelace',
      );

      if (!amount || amount.quantity !== invoice.totalAmount.toString()) {
        invoice.canceled = true;
        await this.em.save(invoice);
        continue;
      }

      invoice.confirmed = true;
      invoice.confirmedAt = new Date().valueOf().toString();

      await this.em.save(invoice);

      this.logger.log(`Invoices # ${invoice.invoiceId} confirmed.`);
    }
  }

  // REPOSITORY

  /**
   * Return all active InvoiceAccount from a defined set
   */
  async findActiveAccounts(
    stakeAddresses: string[],
    includePending = false,
  ): Promise<InvoiceAccount[]> {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);

    const query = this.em
      .getRepository(InvoiceAccount)
      .createQueryBuilder('ia')
      .innerJoinAndSelect('ia.invoice', 'invoice')
      .innerJoinAndSelect('ia.account', 'account')
      .where('account.stakeAddress IN (:...stakeAddresses)', {
        stakeAddresses,
      })
      .andWhere('invoice.createdAt > :aYearAgo', {
        aYearAgo: date.valueOf().toString(),
      })
      .andWhere('invoice.canceled IS FALSE')
      .orderBy('invoice.confirmed', 'DESC')
      .addOrderBy('invoice.createdAt', 'ASC');

    if (!includePending) {
      query.andWhere('invoice.confirmed IS TRUE');
    }

    return query.getMany();
  }

  /**
   * Return all active InvoicePool from a defined set
   */
  async findActivePools(
    poolIds: string[],
    includePending = false,
  ): Promise<InvoicePool[]> {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);

    const query = this.em
      .getRepository(InvoicePool)
      .createQueryBuilder('ip')
      .innerJoinAndSelect('ip.invoice', 'invoice')
      .innerJoinAndSelect('ip.pool', 'pool')
      .where('pool.poolId IN (:...poolIds)', { poolIds })
      .andWhere('invoice.createdAt > :aYearAgo', {
        aYearAgo: date.valueOf().toString(),
      })
      .andWhere('invoice.canceled IS FALSE')
      .orderBy('invoice.confirmed', 'DESC')
      .addOrderBy('invoice.createdAt', 'ASC');

    if (!includePending) {
      query.andWhere('invoice.confirmed IS TRUE');
    }

    return query.getMany();
  }

  async findUserInvoices(userId: number): Promise<Invoice[]> {
    return this.em
      .getRepository(Invoice)
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.accounts', 'invoiceAccount')
      .leftJoinAndSelect('invoiceAccount.account', 'account')
      .leftJoinAndSelect('invoice.pools', 'invoicePool')
      .leftJoinAndSelect('invoicePool.pool', 'pool')
      .where('invoice.user = :userId', { userId })
      .orderBy('invoice.createdAt', 'DESC')
      .getMany();
  }
}
