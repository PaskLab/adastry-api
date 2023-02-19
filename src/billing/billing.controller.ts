import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AccountStateDto } from './dto/account-state.dto';
import { BillingService } from './billing.service';
import { ResponseDto } from '../utils/dto/response.dto';
import { NewInvoiceDto } from './dto/new-invoice.dto';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';
import { InvoiceListDto } from './dto/invoice.dto';
import { ConflictErrorDto } from '../utils/dto/conflict-error.dto';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('accounts-state')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: [AccountStateDto] })
  async accountsState(@Request() request): Promise<AccountStateDto[]> {
    return this.billingService.getAllUserAccountsState(request.user.id);
  }

  @Get('invoice-list')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: InvoiceListDto })
  async invoices(@Request() request): Promise<InvoiceListDto> {
    return this.billingService.getUserInvoices(request.user.id);
  }

  @Post('invoice')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: ResponseDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiConflictResponse({ type: ConflictErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async newInvoice(@Request() req, @Body() newInvoice: NewInvoiceDto) {
    await this.billingService.createInvoice(req.user.id, newInvoice);
    return new ResponseDto(`Payment sent and new invoice created.`);
  }
}
