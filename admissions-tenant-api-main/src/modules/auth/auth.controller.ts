import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterSuperadminDto } from './dto/register-superadmin.dto.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ResponseMessage('Login successful')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('register-superadmin')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ResponseMessage('Superadmin registered successfully')
  registerSuperadmin(@Body() dto: RegisterSuperadminDto) {
    return this.authService.registerSuperadmin(
      dto.name,
      dto.email,
      dto.password,
    );
  }

  // TODO for Phase 2: Add POST /logout endpoint and clear cookies
}
