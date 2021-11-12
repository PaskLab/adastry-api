import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UserDto } from '../user/dto/user.dto';
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
  ): Promise<UserDto | null> {
    const user = await this.userService.getActiveUser(username);
    if (user && (await this.userService.validatePWD(user, password))) {
      return new UserDto({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        currency: user.currency.code,
      });
    }
    return null;
  }

  async login(user: UserDto): Promise<JwtDto> {
    const payload = { sub: user.id };
    return new JwtDto(this.jwtService.sign(payload));
  }
}
