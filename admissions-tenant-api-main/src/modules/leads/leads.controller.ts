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
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { RecordEngagementDto, UpdateFollowUpStatusDto } from './dto/lead-management.dto.js';
import { EngagementType } from './lead-scoring.service.js';

@Controller('organizations/:orgId/leads')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Lead created successfully')
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(orgId, dto);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Leads fetched successfully')
  findAll(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() queryDto: LeadQueryDto,
    @Request() req?: any,
  ) {
    return this.leadsService.findAll(
      orgId,
      queryDto,
      req?.user?.sub,
      req?.user?.role,
    );
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Lead details fetched successfully')
  findOne(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.leadsService.findOne(id, orgId, req.user.sub, req.user.role);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Lead updated successfully')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @Request() req: any,
  ) {
    return this.leadsService.update(id, orgId, req.user.sub, dto, req.user.role);
  }

  @Patch(':id/status')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Lead status updated successfully')
  updateStatus(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.leadsService.updateStatus(id, orgId, status, req.user.sub);
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
    return this.leadsService.addNote(id, orgId, req.user.sub, dto, req.user.role);
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
    return this.leadsService.updateLeadStatus(id, orgId, req.user.sub, dto, req.user.role);
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
    return this.leadsService.close(id, orgId, req.user.sub, dto, req.user.role);
  }

  @Get(':id/activities')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Lead activity fetched successfully')
  activities(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.leadsService.getActivities(id, orgId, req.user.sub, req.user.role);
  }

  @Post(':id/engagement')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Engagement recorded and lead rescored')
  engagement(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordEngagementDto,
    @Request() req: any,
  ) {
    return this.leadsService.recordEngagement(id, orgId, dto.type as EngagementType, {
      count: dto.count,
      note: dto.note,
      actorId: req.user.sub,
      userId: req.user.sub,
      role: req.user.role,
    });
  }

  @Post(':id/rescore')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Lead rescored successfully')
  rescore(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.rescore(id, orgId);
  }

  @Post(':id/reroute')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Lead re-routed successfully')
  reroute(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.leadsService.reroute(id, orgId, req.user.sub);
  }

  @Patch(':id/follow-up-status')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Follow-up status updated')
  followUpStatus(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFollowUpStatusDto,
    @Request() req: any,
  ) {
    return this.leadsService.updateFollowUpStatus(id, orgId, req.user.sub, dto.followUpStatus, dto.nextFollowUpAt, req.user.role);
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
