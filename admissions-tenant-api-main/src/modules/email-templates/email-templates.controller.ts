import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmailTemplatesService, TemplateActor } from './email-templates.service.js';
import { CommunicationDispatchService } from './communication-dispatch.service.js';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto.js';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto.js';
import { SendEmailTemplateDto, ComposeCommunicationDto } from './dto/send-email-template.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { resolveActor } from '../messaging/actor.util.js';

const STAFF = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.LEAD_MANAGER];

async function actorOf(dataSource: DataSource, req: any): Promise<TemplateActor> {
  const a = await resolveActor(dataSource, req);
  return { id: a.id, name: a.name, role: a.role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/email-templates')
export class OrgEmailTemplatesController {
  constructor(
    private readonly service: EmailTemplatesService,
    private readonly dataSource: DataSource,
  ) {}

  @Post()
  @Roles(...STAFF)
  @ResponseMessage('Template created successfully')
  async create(@Param('orgId') orgId: string, @Body() dto: CreateEmailTemplateDto, @Request() req: any) {
    return this.service.create(orgId, dto, await actorOf(this.dataSource, req));
  }

  @Get()
  @Roles(...STAFF)
  @ResponseMessage('Templates fetched successfully')
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('templateCategory') templateCategory?: string,
    @Query('language') language?: string,
  ) {
    return this.service.findAll(orgId, search, category, status, { type, templateCategory, language });
  }

  @Post('send')
  @Roles(...STAFF)
  @ResponseMessage('Email processed')
  async sendEmail(@Param('orgId') orgId: string, @Body() dto: SendEmailTemplateDto, @Request() req: any) {
    return this.service.sendAndLog({ ...dto, organizationId: orgId }, await actorOf(this.dataSource, req));
  }

  @Get(':id')
  @Roles(...STAFF)
  @ResponseMessage('Template fetched successfully')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(...STAFF)
  @ResponseMessage('Template updated successfully')
  async update(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto, @Request() req: any) {
    return this.service.update(id, dto, await actorOf(this.dataSource, req));
  }

  @Post(':id/approve')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Template approved')
  async approve(@Param('id') id: string, @Request() req: any) {
    return this.service.approve(id, await actorOf(this.dataSource, req));
  }

  @Post(':id/archive')
  @Roles(...STAFF)
  @ResponseMessage('Template archived')
  async archive(@Param('id') id: string, @Request() req: any) {
    return this.service.archive(id, await actorOf(this.dataSource, req));
  }

  @Post(':id/restore')
  @Roles(...STAFF)
  @ResponseMessage('Template restored as draft')
  async restore(@Param('id') id: string, @Request() req: any) {
    return this.service.restore(id, await actorOf(this.dataSource, req));
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Template deleted successfully')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.service.delete(id, await actorOf(this.dataSource, req));
  }

  @Post(':id/duplicate')
  @Roles(...STAFF)
  @ResponseMessage('Template duplicated successfully')
  async duplicate(@Param('orgId') orgId: string, @Param('id') id: string, @Request() req: any) {
    return this.service.duplicate(id, await actorOf(this.dataSource, req), orgId);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(
    private readonly service: EmailTemplatesService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @Roles(...STAFF)
  @ResponseMessage('Email templates fetched successfully')
  findAll(
    @Query('orgId') orgId?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.service.findAll(orgId, search, category, status, { type });
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Email template created successfully')
  async create(@Body() dto: CreateEmailTemplateDto, @Request() req: any) {
    const orgId = req.user?.organizationId || null;
    return this.service.create(orgId, dto, await actorOf(this.dataSource, req));
  }

  @Post('send')
  @Roles(...STAFF)
  @ResponseMessage('Email processed')
  async sendEmail(@Body() dto: SendEmailTemplateDto, @Request() req: any) {
    return this.service.sendAndLog(
      { ...dto, organizationId: req.user?.organizationId || undefined },
      await actorOf(this.dataSource, req),
    );
  }

  @Get(':id')
  @Roles(...STAFF)
  @ResponseMessage('Email template fetched successfully')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Email template updated successfully')
  async update(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto, @Request() req: any) {
    return this.service.update(id, dto, await actorOf(this.dataSource, req));
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Email template deleted successfully')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.service.delete(id, await actorOf(this.dataSource, req));
  }

  @Post(':id/duplicate')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Email template duplicated successfully')
  async duplicate(@Param('id') id: string, @Request() req: any) {
    return this.service.duplicate(id, await actorOf(this.dataSource, req));
  }
}

/** Unified compose (Email / SMS / WhatsApp) + resend / cancel for the Communications pages. */
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId/communications')
export class CommunicationDispatchController {
  constructor(
    private readonly dispatch: CommunicationDispatchService,
    private readonly dataSource: DataSource,
  ) {}

  @Post('send')
  @Roles(...STAFF)
  @ResponseMessage('Communication processed')
  async send(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: ComposeCommunicationDto, @Request() req: any) {
    return this.dispatch.compose(orgId, dto as any, await actorOf(this.dataSource, req));
  }

  @Post(':id/resend')
  @Roles(...STAFF)
  @ResponseMessage('Communication resent')
  async resend(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.dispatch.resend(orgId, id, await actorOf(this.dataSource, req));
  }

  @Post(':id/cancel')
  @Roles(...STAFF)
  @ResponseMessage('Scheduled communication cancelled')
  cancel(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.dispatch.cancel(orgId, id);
  }
}
