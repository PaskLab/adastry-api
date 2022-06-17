import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { AuthService } from './auth.service';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedErrorDto } from '../utils/dto/unauthorized-error.dto';
import { JwtDto } from './dto/jwt.dto';
import { NotFoundErrorDto } from '../utils/dto/not-found-error.dto';
import { SignatureAuthGuard } from './guard/signature-auth.guard';
import { SignatureDto } from './dto/signature.dto';
import { AddressParam } from './params/address.param';
import { PayloadDto } from './dto/payload.dto';
import { BadRequestErrorDto } from '../utils/dto/bad-request-error.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: JwtDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedErrorDto })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(SignatureAuthGuard)
  @Post('login-signature')
  @ApiBody({ type: SignatureDto })
  @ApiOkResponse({ type: JwtDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedErrorDto })
  async signatureLogin(@Request() req) {
    return this.authService.login(req.user);
  }

  @Get('auth-message/:address')
  @ApiOkResponse({ type: PayloadDto })
  @ApiBadRequestResponse({ type: BadRequestErrorDto })
  async getMessage(@Param() param: AddressParam): Promise<PayloadDto> {
    return this.authService.getEphemeralPayload('Adastry Auth', param.address);
  }
}
