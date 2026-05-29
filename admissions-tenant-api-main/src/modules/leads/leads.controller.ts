import {
  Controller,
  Get,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
  Patch,
  Body,
  Post,
  Request,
} from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { LeadQueryDto } from './dto/lead-query.dto.js';
import { VerifyLeadDto } from './dto/verify-lead.dto.js';
import { AssignLeadDto } from './dto/assign-lead.dto.js';
import { AddLeadNoteDto } from './dto/add-lead-note.dto.js';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto.js';
import { CloseLeadDto } from './dto/close-lead.dto.js';

@Controller('organizations/:orgId/leads')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Leads fetched successfully')
  findAll(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() queryDto: LeadQueryDto,
    @Request() req?: any,
  ) {
    return this.leadsService.findAll(
      orgId,
      queryDto as PaginationDto,
      queryDto.search,
      queryDto.status,
      queryDto.assignedTo,
      queryDto.followUpDate,
      queryDto.scoreBand,
      req?.user?.sub,
    );
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

  @Patch(':id/status')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Lead status updated successfully')
  updateStatus(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.leadsService.updateStatus(id, orgId, status);
  }

  @Patch(':id/verify')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Lead verified successfully')
  verify(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyLeadDto,
    @Request() req: any,
  ) {
    return this.leadsService.verify(id, orgId, req.user.sub, dto);
  }

  @Patch(':id/assign')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Lead assigned successfully')
  assign(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignLeadDto,
    @Request() req: any,
  ) {
    return this.leadsService.assign(id, orgId, req.user.sub, dto);
  }

  @Post(':id/notes')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Lead note added successfully')
  addNote(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLeadNoteDto,
    @Request() req: any,
  ) {
    return this.leadsService.addNote(id, orgId, req.user.sub, dto);
  }

  @Patch(':id/workflow-status')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Lead workflow status updated successfully')
  updateLeadStatus(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadStatusDto,
    @Request() req: any,
  ) {
    return this.leadsService.updateLeadStatus(id, orgId, req.user.sub, dto);
  }

  @Patch(':id/close')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Lead closed successfully')
  close(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseLeadDto,
    @Request() req: any,
  ) {
    return this.leadsService.close(id, orgId, req.user.sub, dto);
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
