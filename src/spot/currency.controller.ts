import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SpotService } from './spot.service';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { CurrencyDto } from './dto/currency.dto';
import { CodeParam } from './params/code.param';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { RateDto } from './dto/rate.dto';
import { HistoryParam } from '../utils/params/history.param';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Curreny')
@Controller('currency')
export class CurrencyController {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly spotService: SpotService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: [CurrencyDto],
    description: 'Return supported Currencies',
  })
  currencyList(): Promise<CurrencyDto[]> {
    return this.spotService.getAllCurrencies();
  }

  @Get(':code')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: CurrencyDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  currencyInfo(@Param() param: CodeParam): Promise<CurrencyDto> {
    return this.spotService.getCurrency(param.code);
  }

  @Get(':code/rate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: RateDto,
    description: 'Last epoch rate for currency.',
  })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  rate(@Param() param: CodeParam): Promise<RateDto> {
    return this.spotService.getRate(param.code);
  }

  @Get(':code/rate-history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: [RateDto], description: 'Currency rate history' })
  rateHistory(
    @Param() param: CodeParam,
    @Query() query: HistoryParam,
  ): Promise<RateDto[]> {
    return this.spotService.getRateHistory({ ...param, ...query });
  }
}
