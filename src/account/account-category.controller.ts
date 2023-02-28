import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Patch,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { CreateCategoryDto } from './dto/category/create-category.dto';
import { AccountCategoryService } from './account-category.service';
import { AccountCategoryDto } from './dto/category/account-category.dto';
import { ResponseDto } from '../utils/dto/response.dto';
import { UpdateCategoryDto } from './dto/category/update-category.dto';
import { SlugParam } from './params/slug.param';

@ApiTags('Account Category')
@Controller('account/category')
export class AccountCategoryController {
  constructor(
    private readonly accountCategoryService: AccountCategoryService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: AccountCategoryDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  async createCategory(
    @Request() req,
    @Body() body: CreateCategoryDto,
  ): Promise<AccountCategoryDto> {
    return this.accountCategoryService.createCategory(req.user.id, body.name);
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: AccountCategoryDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  async update(
    @Request() req,
    @Body() body: UpdateCategoryDto,
  ): Promise<AccountCategoryDto> {
    return this.accountCategoryService.updateCategory(req.user.id, body);
  }

  @Get('list')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ type: [AccountCategoryDto] })
  async list(@Request() req): Promise<AccountCategoryDto[]> {
    return this.accountCategoryService.getAll(req.user.id);
  }

  @Delete(':slug')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Category successfully deleted.',
    type: ResponseDto,
  })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async remove(
    @Request() req,
    @Param() param: SlugParam,
  ): Promise<ResponseDto> {
    await this.accountCategoryService.remove(req.user.id, param.slug);
    return new ResponseDto(`Category ${param.slug} successfully deleted.`);
  }
}
