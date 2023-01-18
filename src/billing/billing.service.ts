import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
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

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly MIN_LOYALTY = config.app.minLoyalty;
  private readonly BILLING_CONFIG = config.app.billing;

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
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

    const totalAmount =
      newInvoice.accounts.length * this.BILLING_CONFIG.accountUnitPrice +
      newInvoice.pools.length * this.BILLING_CONFIG.poolUnitPrice;

    const invoice = new Invoice();
    invoice.invoiceId = newInvoice.invoiceId;
    invoice.txHash = newInvoice.txHash;
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

    return this.em.save(invoice);
  }

  async getUserAccountsState(userId: number): Promise<AccountStateDto[]> {
    const userAccounts = await this.userAccountService.findAllUserAccount(
      userId,
    );

    const stakeAddresses = userAccounts.map((ua) => ua.account.stakeAddress);
    const poolIds = [
      ...new Set([
        ...userAccounts
          .filter((ua) => ua.account.pool)
          .map((ua) => ua.account.pool!.poolId),
      ]),
    ];

    const activeInvoiceAccounts = await this.findActiveAccounts(stakeAddresses);
    const activeInvoicePools = await this.findActivePools(poolIds);

    const activeAccounts: AccountStateDto[] = [];

    for (const account of userAccounts) {
      const iAccount = activeInvoiceAccounts.findIndex(
        (ia) => ia.account.stakeAddress === account.account.stakeAddress,
      );
      if (iAccount >= 0) {
        activeAccounts.push(
          new AccountStateDto({
            stakeAddress: account.account.stakeAddress,
            name: account.name,
            active: true,
            type: 'account',
            invoiceId: activeInvoiceAccounts[iAccount].invoice.invoiceId,
            createdAt: activeInvoiceAccounts[iAccount].invoice.createdAt,
            confirmedAt: activeInvoiceAccounts[iAccount].invoice.confirmedAt,
          }),
        );
        continue;
      }
      const iPool = activeInvoicePools.findIndex(
        (ip) => ip.pool.poolId === account.account.pool?.poolId,
      );
      if (iPool >= 0) {
        activeAccounts.push(
          new AccountStateDto({
            stakeAddress: account.account.stakeAddress,
            name: account.name,
            active: true,
            type: 'pool',
            invoiceId: activeInvoicePools[iPool].invoice.invoiceId,
            createdAt: activeInvoicePools[iPool].invoice.createdAt,
            confirmedAt: activeInvoicePools[iPool].invoice.confirmedAt,
          }),
        );
        continue;
      }
      if (account.account.loyalty >= this.MIN_LOYALTY) {
        activeAccounts.push(
          new AccountStateDto({
            stakeAddress: account.account.stakeAddress,
            name: account.name,
            active: true,
            type: 'member',
            invoiceId: '',
            createdAt: '',
            confirmedAt: '',
          }),
        );
        continue;
      }
      activeAccounts.push(
        new AccountStateDto({
          stakeAddress: account.account.stakeAddress,
          name: account.name,
          active: false,
          type: 'none',
          invoiceId: '',
          createdAt: '',
          confirmedAt: '',
        }),
      );
    }

    return activeAccounts;
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
          }),
      ),
    });
  }

  @Cron('0 */5 * * * *', {
    name: 'Invoices Validation',
    timeZone: 'America/Toronto',
  })
  private async confirmInvoices(): Promise<void> {
    // 2 days ago
    const dateLimit = new Date();
    dateLimit.setHours(dateLimit.getHours() - 48);

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

  /**
   * Return all active InvoiceAccount from a defined set
   * @param stakeAddresses
   */
  async findActiveAccounts(
    stakeAddresses: string[],
  ): Promise<InvoiceAccount[]> {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);

    return this.em
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
      .andWhere('invoice.confirmed IS TRUE')
      .orderBy('invoice.createdAt')
      .getMany();
  }

  /**
   * Return all active InvoicePool from a defined set
   * @param poolIds
   */
  async findActivePools(poolIds: string[]): Promise<InvoicePool[]> {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);

    return this.em
      .getRepository(InvoicePool)
      .createQueryBuilder('ip')
      .innerJoinAndSelect('ip.invoice', 'invoice')
      .innerJoinAndSelect('ip.pool', 'pool')
      .where('pool.poolId IN (:...pools)', { pools: poolIds })
      .andWhere('invoice.createdAt > :aYearAgo', {
        aYearAgo: date.valueOf().toString(),
      })
      .andWhere('invoice.confirmed IS TRUE')
      .orderBy('invoice.createdAt')
      .getMany();
  }

  async findLastAccountInvoice(
    stakeAddress: string,
  ): Promise<InvoiceAccount | null> {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);

    return this.em
      .getRepository(InvoiceAccount)
      .createQueryBuilder('ia')
      .innerJoinAndSelect('ia.invoice', 'invoice')
      .leftJoinAndSelect('ia.account', 'account')
      .where('invoice.createdAt > :aYearAgo', {
        aYearAgo: date.valueOf().toString(),
      })
      .andWhere('invoice.confirmed IS TRUE')
      .andWhere('account.stakeAddress = :stakeAddress', {
        stakeAddress: stakeAddress,
      })
      .orderBy('invoice.createdAt', 'DESC')
      .getOne();
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
