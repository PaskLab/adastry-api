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
} from '@nestjs/common';
import { AccountService } from './account.service';
import { AddUserAccountDto } from './dto/add-user-account.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccountDto } from './dto/account.dto';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';
import { ResponseDto } from '../utils/dto/response.dto';
import { AccountHistoryDto } from './dto/account-history.dto';
import { StakeAddressParam } from '../utils/params/stake-address.param';
import { HistoryParam } from '../utils/params/history.param';
import { ConflictErrorDto } from '../utils/dto/conflict-error.dto';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserAccountService } from './user-account.service';
import { UserAccountDto } from './dto/user-account.dto';
import { YearParam } from './params/year.param';
import { CsvFileDto } from './dto/csv-file.dto';
import { CsvFormatParam } from './params/csv-format.param';

@ApiTags('User Account')
@Controller('account')
export class UserAccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly userAccountService: UserAccountService,
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
  @ApiOkResponse({ type: [AccountHistoryDto] })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async accountHistory(
    @Param() param: StakeAddressParam,
    @Query() query: HistoryParam,
  ): Promise<AccountHistoryDto[]> {
    return this.accountService.getHistory({ ...param, ...query });
  }

  @Get(':stakeAddress/export-rewards/:year')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: CsvFileDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async exportRewards(
    @Request() request,
    @Param() stakeAddressParam: StakeAddressParam,
    @Param() yearParam: YearParam,
    @Query() formatParam: CsvFormatParam,
  ): Promise<CsvFileDto> {
    return this.accountService.getRewardsCSV(
      request,
      stakeAddressParam.stakeAddress,
      yearParam.year,
      formatParam.format,
    );
  }
}
