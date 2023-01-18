import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { AddUserAccountDto } from './dto/add-user-account.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccountDto } from './dto/account.dto';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';
import { ResponseDto } from '../utils/dto/response.dto';
import { StakeAddressParam } from '../utils/params/stake-address.param';
import { HistoryParam } from '../utils/params/history.param';
import { ConflictErrorDto } from '../utils/dto/conflict-error.dto';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { UserAccountService } from './user-account.service';
import { UserAccountDto } from './dto/user-account.dto';
import { YearParam } from './params/year.param';
import { CsvFileDto } from './dto/csv-file.dto';
import {
  RewardsCsvFormatParam,
  TxCsvFormatParam,
} from './params/csv-format.param';
import config from '../../config.json';
import { TransactionListDto } from './dto/transaction.dto';
import { TransactionService } from './transaction.service';
import { TxHistoryParam } from './params/tx-history.param';
import { AccountHistoryListDto } from './dto/account-history.dto';
import { QuarterParam } from './params/quarter.param';
import { ForbiddenErrorDto } from '../utils/dto/forbidden-error.dto';
import { UserPoolDto } from './dto/user-pool.dto';

@ApiTags('User Account')
@Controller('account')
export class UserAccountController {
  private readonly MIN_LOYALTY = config.app.minLoyalty;

  constructor(
    private readonly accountService: AccountService,
    private readonly userAccountService: UserAccountService,
    private readonly transactionService: TransactionService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: ResponseDto })
  @ApiConflictResponse({ type: ConflictErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  async addUserAccount(
    @Request() req,
    @Body() addUserAccountDto: AddUserAccountDto,
  ): Promise<ResponseDto> {
    const userAccount = await this.userAccountService.create(
      req.user.id,
      addUserAccountDto,
    );
    return new ResponseDto(
      `User account ${userAccount.account.stakeAddress} successfully added.`,
    );
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: ResponseDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  async update(
    @Request() req,
    @Body() updateAccountDto: UpdateUserAccountDto,
  ): Promise<ResponseDto> {
    await this.userAccountService.update(req.user.id, updateAccountDto);

    return new ResponseDto(
      `Account ${updateAccountDto.stakeAddress} successfully updated.`,
    );
  }

  @Get('list')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: [UserAccountDto] })
  async list(@Request() req): Promise<UserAccountDto[]> {
    return this.userAccountService.getAll(req.user.id);
  }

  @Get('pool-list')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: [UserPoolDto] })
  async poolsList(@Request() req): Promise<UserPoolDto[]> {
    return this.userAccountService.getUserDelegatedPools(req.user.id);
  }

  @Get(':stakeAddress')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: AccountDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  accountInfo(
    @Request() req,
    @Param() param: StakeAddressParam,
  ): Promise<AccountDto> {
    return this.userAccountService.getAccountInfo(
      req.user.id,
      param.stakeAddress,
    );
  }

  @Delete(':stakeAddress')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Account successfully deleted.',
    type: ResponseDto,
  })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiConflictResponse({ type: ConflictErrorDto })
  async remove(
    @Request() req,
    @Param() param: StakeAddressParam,
  ): Promise<ResponseDto> {
    await this.userAccountService.remove(req.user.id, param.stakeAddress);
    return new ResponseDto(
      `Account ${param.stakeAddress} successfully deleted.`,
    );
  }

  @Get(':stakeAddress/history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: AccountHistoryListDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async accountHistory(
    @Request() request,
    @Param() param: StakeAddressParam,
    @Query() query: HistoryParam,
  ): Promise<AccountHistoryListDto> {
    return this.accountService.getHistory(request.user.id, {
      ...param,
      ...query,
    });
  }

  @Get(':stakeAddress/transactions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: TransactionListDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async accountTransactions(
    @Param() param: StakeAddressParam,
    @Query() query: TxHistoryParam,
  ): Promise<TransactionListDto> {
    return this.transactionService.getHistory(param.stakeAddress, query);
  }

  @Get(':stakeAddress/export-transactions/:year')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: CsvFileDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiForbiddenResponse({ type: ForbiddenErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async exportTransactions(
    @Request() request,
    @Param() stakeAddressParam: StakeAddressParam,
    @Param() yearParam: YearParam,
    @Query() formatParam: TxCsvFormatParam,
    @Query() quarterParam: QuarterParam,
  ): Promise<CsvFileDto> {
    if (
      !(await this.accountService.loyaltyCheck(
        stakeAddressParam.stakeAddress,
        this.MIN_LOYALTY,
      ))
    ) {
      throw new ForbiddenException(
        `Premium feature. Account must be delegated to Armada-Alliance for at least ${this.MIN_LOYALTY} epoch.`,
      );
    }

    return this.transactionService.getTransactionsCSV(
      request,
      stakeAddressParam.stakeAddress,
      yearParam.year,
      formatParam.format,
      quarterParam.quarter,
    );
  }

  @Get('export-transactions/:year')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: CsvFileDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async exportBulkTransactions(
    @Request() request,
    @Param() yearParam: YearParam,
    @Query() formatParam: TxCsvFormatParam,
    @Query() quarterParam: QuarterParam,
  ): Promise<CsvFileDto> {
    return this.userAccountService.getBulkTransactionsCSV(
      request,
      request.user.id,
      yearParam.year,
      formatParam.format,
      quarterParam.quarter,
    );
  }

  @Get(':stakeAddress/export-rewards/:year')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: CsvFileDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiForbiddenResponse({ type: ForbiddenErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async exportRewards(
    @Request() request,
    @Param() stakeAddressParam: StakeAddressParam,
    @Param() yearParam: YearParam,
    @Query() formatParam: RewardsCsvFormatParam,
    @Query() quarterParam: QuarterParam,
  ): Promise<CsvFileDto> {
    if (
      !(await this.accountService.loyaltyCheck(
        stakeAddressParam.stakeAddress,
        this.MIN_LOYALTY,
      ))
    ) {
      throw new ForbiddenException(
        `Premium feature. Account must be delegated to Armada-Alliance for at least ${this.MIN_LOYALTY} epoch.`,
      );
    }

    return this.accountService.getRewardsCSV(
      request,
      request.user.id,
      stakeAddressParam.stakeAddress,
      yearParam.year,
      formatParam.format,
      quarterParam.quarter,
    );
  }

  @Get('export-rewards/:year')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: CsvFileDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async exportBulkRewards(
    @Request() request,
    @Param() yearParam: YearParam,
    @Query() formatParam: RewardsCsvFormatParam,
    @Query() quarterParam: QuarterParam,
  ): Promise<CsvFileDto> {
    return this.userAccountService.getBulkRewardsCSV(
      request,
      request.user.id,
      yearParam.year,
      formatParam.format,
      quarterParam.quarter,
    );
  }
}
