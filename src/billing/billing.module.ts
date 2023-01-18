import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceAccount } from './entities/invoice-account.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InvoicePool } from './entities/invoice-pool.entity';
import { AccountModule } from '../account/account.module';

export const entities = [Invoice, InvoiceAccount, InvoicePool];

@Module({
  imports: [
    TypeOrmModule.forFeature(entities),
    forwardRef(() => AccountModule),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
