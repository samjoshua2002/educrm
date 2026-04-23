import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Request,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/me')
  @ResponseMessage('Profile fetched successfully')
  getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @Post('organizations/:orgId/users')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Staff user created successfully')
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateUserDto,
    @Request() req: any,
  ) {
    const actor = { id: req.user.sub, role: req.user.role as Role };
    return this.usersService.create(dto, orgId, actor);
  }

  @Get('organizations/:orgId/users')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Staff users fetched successfully')
  findAll(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.usersService.findAllByOrg(orgId, paginationDto);
  }

  @Patch('organizations/:orgId/users/:id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('User updated successfully')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: any,
  ) {
    const actor = { id: req.user.sub, role: req.user.role as Role };
    return this.usersService.update(id, orgId, dto, actor);
  }

  @Delete('organizations/:orgId/users/:id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('User deleted successfully')
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.remove(id, orgId);
  }
}
