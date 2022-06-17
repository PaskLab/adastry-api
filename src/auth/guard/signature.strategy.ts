import { Strategy } from 'passport-custom';
import { PassportStrategy } from '@nestjs/passport';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { SignatureDto } from '../dto/signature.dto';

@Injectable()
export class SignatureStrategy extends PassportStrategy(Strategy, 'signature') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(request: Request): Promise<number> {
    const body: SignatureDto = request.body;

    if (!body.signature || !body.key || Object.keys(body).length !== 2) {
      throw new BadRequestException('Posted object have wrong format');
    }
    const user = await this.authService.validateSignature(
      body.key,
      body.signature,
    );

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
