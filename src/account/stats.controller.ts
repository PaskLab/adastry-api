import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';
import { MonthlyRewardsListDto } from './dto/stats/monthly-rewards.dto';
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
  @ApiOkResponse({ type: MonthlyRewardsListDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  async monthlyRewards(
    @Request() request,
    @Query() yearQuery: YearParam,
    @Query() monthQuery: MonthParam,
  ): Promise<MonthlyRewardsListDto> {
    return this.statsService.perMonthRewards(
      request.user.id,
      yearQuery.year,
      monthQuery.month,
    );
  }
}
