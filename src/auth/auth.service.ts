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

  async validateUser(email: string, password: string): Promise<UserDto | null> {
    const user = await this.userService.getActiveUser(email);
    if (user && (await this.userService.validatePWD(user, password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return new UserDto(result);
    }
    return null;
  }

  async login(user: UserDto): Promise<JwtDto> {
    const payload = { sub: user.id };
    return new JwtDto(this.jwtService.sign(payload));
  }
}
