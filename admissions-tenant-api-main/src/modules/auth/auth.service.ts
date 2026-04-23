import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { OrgStatus } from '../organizations/entities/organization.entity.js';
import { Role } from '../../common/enums/roles.enum.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check Organization Status (Skip for platform Superadmins)
    if (user.role !== Role.SUPERADMIN && user.organization) {
      if (user.organization.status !== OrgStatus.ACTIVE) {
        throw new UnauthorizedException(
          `Access denied: Your organization is ${user.organization.status}. Please contact support.`,
        );
      }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // TODO for Phase 2 Production: Implement HttpOnly cookie login
    // setCookie(res, 'auth_token', token, { httpOnly: true, secure: true, sameSite: 'strict' });
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async registerSuperadmin(name: string, email: string, password: string) {
    return this.usersService.createSuperadmin(name, email, password);
  }
}
