import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EventsService } from './events.service.js';
import { CreateEventDto, AudiencePreviewDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/events')
export class OrgEventsController {
  constructor(private readonly service: EventsService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Announcement or Event created successfully')
  create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateEventDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    const userName = req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim();
    return this.service.create(orgId, dto, userId, userName);
  }

  /** How many staff / students / leads / applicants a targeting selection reaches. */
  @Post('audience-preview')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Audience preview fetched successfully')
  previewAudience(@Param('orgId') orgId: string, @Body() dto: AudiencePreviewDto) {
    return this.service.previewAudience(orgId, dto);
  }

  @Get()
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
    Role.EXAM_MANAGER,
    Role.STUDENT,
  )
  @ResponseMessage('Announcements & Events fetched successfully')
  findAll(
    @Param('orgId') orgId: string,
    @Request() req: any,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('audience') audience?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      orgId,
      {
        search,
        type,
        category,
        status,
        priority,
        audience,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      },
      { sub: req.user?.sub, role: req.user?.role },
    );
  }

  @Get(':id')
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
    Role.EXAM_MANAGER,
    Role.STUDENT,
  )
  @ResponseMessage('Announcement or Event fetched successfully')
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.LEAD_MANAGER)
  @ResponseMessage('Announcement or Event updated successfully')
  update(
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.service.update(id, orgId, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Announcement or Event deleted successfully')
  remove(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.service.remove(id, orgId);
  }

  @Post(':id/broadcast')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.LEAD_MANAGER)
  @ResponseMessage('Broadcast initiated successfully')
  broadcast(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.service.broadcast(id, orgId);
  }
}
