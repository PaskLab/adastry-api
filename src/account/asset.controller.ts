import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AssetMappingService } from './asset-mapping.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';
import { UserMappingListDto } from './dto/asset/user-mapping.dto';
import { PageParam } from '../utils/params/page.param';
import { ToggleMappingDto } from './dto/asset/toggle-mapping.dto';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { ResponseDto } from '../utils/dto/response.dto';
import { AssetMappingListDto } from './dto/asset/asset-mapping.dto';
import { SearchParam } from '../utils/params/search.param';
import { MappingRequestDto } from './dto/asset/mapping-request.dto';
import { ConflictErrorDto } from '../utils/dto/conflict-error.dto';

@ApiTags('Asset')
@Controller('asset')
export class AssetController {
  constructor(private readonly assetMappingService: AssetMappingService) {}

  @Get('user-mapping')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: UserMappingListDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async userMapping(
    @Request() request,
    @Query() search: SearchParam,
    @Query() params: PageParam,
  ): Promise<UserMappingListDto> {
    return this.assetMappingService.getUserMapping(
      request.user.id,
      params,
      search.search,
    );
  }

  @Get('global-mapping')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: AssetMappingListDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async globalMapping(
    @Query() search: SearchParam,
    @Query() params: PageParam,
  ): Promise<AssetMappingListDto> {
    return this.assetMappingService.getGlobalMapping(params, search.search);
  }

  @Patch('user-mapping/toggle-options')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: ResponseDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async toggleMappingOptions(
    @Request() request,
    @Body() body: ToggleMappingDto,
  ): Promise<ResponseDto> {
    await this.assetMappingService.toggleMappingOptions(request.user.id, body);
    return new ResponseDto(`${body.fingerprint} updated`);
  }

  @Post('mapping-request')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: ResponseDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiConflictResponse({ type: ConflictErrorDto })
  async mappingRequest(@Body() body: MappingRequestDto): Promise<ResponseDto> {
    await this.assetMappingService.createMappingRequest(body);
    return new ResponseDto(`Mapping request sent for ${body.hexId}`);
  }
}
