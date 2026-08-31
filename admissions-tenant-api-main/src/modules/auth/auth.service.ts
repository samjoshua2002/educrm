import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { OrgStatus } from '../organizations/entities/organization.entity.js';
import { Role } from '../../common/enums/roles.enum.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async login(email: string, password: string) {
    console.log(`[AuthDebug] Login attempt for email: "${email}"`);
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      console.log(`[AuthDebug] User not found for email: "${email}"`);
      throw new UnauthorizedException('Invalid email or password');
    }

    console.log(`[AuthDebug] User found: id=${user.id}, role=${user.role}, isActive=${user.isActive}, orgId=${user.organizationId}`);

    if (!user.isActive) {
      console.log(`[AuthDebug] User is not active`);
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check Organization Status (Skip for platform Superadmins)
    if (user.role !== Role.SUPERADMIN && user.organization) {
      console.log(`[AuthDebug] Checking organization status: "${user.organization.status}"`);
      if (user.organization.status !== OrgStatus.ACTIVE) {
        console.log(`[AuthDebug] Organization status is not active: "${user.organization.status}"`);
        throw new UnauthorizedException(
          `Access denied: Your organization is ${user.organization.status}. Please contact support.`,
        );
      }
    }

    if (!user.password) {
      console.log(`[AuthDebug] User has no password set`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`[AuthDebug] Password match result: ${isMatch}`);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
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

  async studentVerifyOtp(email: string, otp: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    const user = await this.usersService.findByEmail(cleanEmail);
    if (!user || !user.oneTimePassword || user.oneTimePassword !== cleanOtp) {
      throw new UnauthorizedException('Invalid email or One-Time Password');
    }

    return {
      success: true,
      message: 'OTP verified successfully. Please set your new password.',
      email: user.email,
    };
  }

  async studentSetPassword(email: string, otp: string, newPassword: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    const user = await this.usersService.findByEmail(cleanEmail);
    if (!user || !user.oneTimePassword || user.oneTimePassword !== cleanOtp) {
      throw new UnauthorizedException('Invalid One-Time Password or session expired');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new UnauthorizedException('Password must be at least 8 characters long');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.oneTimePassword = null as any;

    await this.userRepo.save(user);

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
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
