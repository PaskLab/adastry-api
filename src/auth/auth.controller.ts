import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import {
  ApiBody,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { UnauthorizedErrorDto } from '../utils/dto/unauthorized-error.dto';
import { JwtDto } from './dto/jwt.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: JwtDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedErrorDto })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }
}
