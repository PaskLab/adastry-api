import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';
import { MonthlyListDto } from './dto/stats/monthly.dto';
import { MonthParam } from './params/month.param';
import { YearParam } from './params/year.param';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';

@ApiTags('Account Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('monthly-rewards')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: MonthlyListDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  async monthlyRewards(
    @Request() request,
    @Query() yearQuery: YearParam,
    @Query() monthQuery: MonthParam,
  ): Promise<MonthlyListDto> {
    return this.statsService.perMonthRewards(
      request.user.id,
      yearQuery.year,
      monthQuery.month,
    );
  }

  @Get('monthly-stake')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: MonthlyListDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  async monthlyStake(
    @Request() request,
    @Query() yearQuery: YearParam,
    @Query() monthQuery: MonthParam,
  ): Promise<MonthlyListDto> {
    return this.statsService.perMonthStake(
      request.user.id,
      yearQuery.year,
      monthQuery.month,
    );
  }
}
