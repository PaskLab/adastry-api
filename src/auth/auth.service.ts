import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { JwtDto } from './dto/jwt.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<number | null> {
    const user = await this.userService.getActiveUser(username);
    if (user && (await this.userService.validatePWD(user, password))) {
      return user.id;
    }
    return null;
  }

  async login(userId: number): Promise<JwtDto> {
    const payload = { sub: userId };
    return new JwtDto(this.jwtService.sign(payload));
  }
}
