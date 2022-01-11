import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import {
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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: JwtDto })
  @ApiNotFoundResponse({ type: NotFoundErrorDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedErrorDto })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
