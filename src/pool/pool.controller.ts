import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PoolService } from './pool.service';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { PoolDto, PoolListDto } from './dto/pool.dto';
import { PageParam } from '../utils/params/page.param';
import { PoolIdParam } from '../utils/params/pool-id.param';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { HistoryParam } from '../utils/params/history.param';
import { PoolHistoryListDto } from './dto/pool-history.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@ApiTags('Pool')
@Controller('pool')
export class PoolController {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly poolService: PoolService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: PoolListDto, description: 'Return member pools' })
  list(@Query() query: PageParam): Promise<PoolListDto> {
    return this.poolService.getMemberPools(query);
  }

  @Get(':poolId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: PoolDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  poolInfo(@Param() param: PoolIdParam): Promise<PoolDto> {
    return this.poolService.getPoolInfo(param.poolId);
  }

  @Get(':poolId/history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: PoolHistoryListDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  poolHistory(
    @Param() param: PoolIdParam,
    @Query() query: HistoryParam,
  ): Promise<PoolHistoryListDto> {
    return this.poolService.getPoolHistory({ ...param, ...query });
  }
}
