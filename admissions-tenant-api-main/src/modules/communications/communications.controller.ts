import {
  Controller,
  Patch,
  ParseUUIDPipe,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommunicationsService } from './communications.service.js';
import { DataSource } from 'typeorm';
import { CreateCommunicationLogDto, CreateInteractionDto, UpdateInteractionDto } from './dto/create-communication-log.dto.js';
import { CommunicationHistoryService } from './communication-history.service.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { resolveActor } from '../messaging/actor.util.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

const STAFF_ROLES = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.LEAD_MANAGER];

@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Get()
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
  )
  @ResponseMessage('Communication logs fetched successfully')
  findAll(
    @Query('applicationNo') applicationNo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const orgId = req?.user?.organizationId;
    return this.service.findAll(
      orgId,
      applicationNo,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get('*id')
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
  )
  @ResponseMessage('Communication log fetched successfully')
  findOne(@Param('id') id: string | string[]) {
    const raw = Array.isArray(id) ? id.join('/') : id;
    return this.service.findOne(decodeURIComponent(raw));
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.LEAD_MANAGER)
  @ResponseMessage('Communication logged successfully')
  create(@Body() dto: CreateCommunicationLogDto) {
    return this.service.create(dto);
  }
}

/**
 * Organization-scoped Communication History API (scope §5):
 * one chronological timeline per applicant / lead across Email, SMS,
 * WhatsApp, Call and System events.
 */
@Controller('organizations/:orgId/communications')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class OrgCommunicationsController {
  constructor(
    private readonly history: CommunicationHistoryService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('timeline')
  @Roles(...STAFF_ROLES)
  @ResponseMessage('Communication timeline fetched successfully')
  timeline(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('applicationId') applicationId?: string,
    @Query('leadId') leadId?: string,
    @Query('channel') channel?: string,
    @Query('includeSystem') includeSystem?: string,
  ) {
    return this.history.getTimeline(orgId, { applicationId, leadId, channel, includeSystem });
  }

  @Get('stats')
  @Roles(...STAFF_ROLES)
  @ResponseMessage('Communication statistics fetched successfully')
  stats(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.history.stats(orgId);
  }

  @Get()
  @Roles(...STAFF_ROLES)
  @ResponseMessage('Communications fetched successfully')
  list(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: Record<string, string>) {
    return this.history.list(orgId, q);
  }

  @Post('interactions')
  @Roles(...STAFF_ROLES)
  @ResponseMessage('Interaction logged successfully')
  async createInteraction(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateInteractionDto,
    @Request() req: any,
  ) {
    const actor = await resolveActor(this.dataSource, req);
    return this.history.createInteraction(orgId, dto as any, actor);
  }

  @Get('interactions/:id')
  @Roles(...STAFF_ROLES)
  @ResponseMessage('Interaction fetched successfully')
  getInteraction(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.history.getInteraction(orgId, id);
  }

  @Patch('interactions/:id')
  @Roles(...STAFF_ROLES)
  @ResponseMessage('Interaction updated successfully')
  updateInteraction(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInteractionDto,
  ) {
    return this.history.updateInteraction(orgId, id, dto as any);
  }
}
