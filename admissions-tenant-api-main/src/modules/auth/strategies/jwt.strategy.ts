import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';
import { UnauthorizedException } from '@nestjs/common';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string | null;
  tokenVersion: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token is invalid or has expired');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
      tokenVersion: payload.tokenVersion,
    };
  }
}
