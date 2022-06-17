import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { EpochService } from './epoch.service';
import { EpochDto, EpochListDto } from './dto/epoch.dto';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { EpochParam } from './params/epoch.param';
import { HistoryParam } from '../utils/params/history.param';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@ApiTags('Epoch')
@Controller('epoch')
export class EpochController {
  constructor(private readonly epochService: EpochService) {}

  @Get('last')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: EpochDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  lastEpoch(): Promise<EpochDto> {
    return this.epochService.getLastEpoch();
  }

  @Get('history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: EpochListDto })
  epochHistory(@Query() query: HistoryParam): Promise<EpochListDto> {
    return this.epochService.getHistory(query);
  }

  @Get(':epoch')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: EpochDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  epoch(@Param() param: EpochParam): Promise<EpochDto> {
    return this.epochService.getEpoch(param.epoch);
  }
}
