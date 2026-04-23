import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('organizations/:orgId/leads')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Leads fetched successfully')
  findAll(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() paginationDto: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.leadsService.findAll(orgId, paginationDto, search);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Lead details fetched successfully')
  findOne(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.findOne(id, orgId);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Lead deleted successfully')
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.remove(id, orgId);
  }
}
