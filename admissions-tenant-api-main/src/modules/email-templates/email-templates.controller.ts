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
} from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service.js';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto.js';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto.js';
import { SendEmailTemplateDto } from './dto/send-email-template.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/email-templates')
export class OrgEmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Email template created successfully')
  create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateEmailTemplateDto,
  ) {
    return this.service.create(orgId, dto);
  }

  @Get()
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
  )
  @ResponseMessage('Email templates fetched successfully')
  findAll(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(orgId, search, category, status);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Email template fetched successfully')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Email template updated successfully')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Email template deleted successfully')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post(':id/duplicate')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Email template duplicated successfully')
  duplicate(@Param('id') id: string) {
    return this.service.duplicate(id);
  }

  @Post('send')
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
  )
  @ResponseMessage('Email sent successfully')
  sendEmail(@Body() dto: SendEmailTemplateDto) {
    return this.service.sendEmail(dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  @Get()
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
  )
  @ResponseMessage('Email templates fetched successfully')
  findAll(
    @Query('orgId') orgId?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(orgId, search, category, status);
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Email template created successfully')
  create(
    @Body() dto: CreateEmailTemplateDto,
    @Request() req: any,
  ) {
    const orgId = req.user?.organizationId || null;
    return this.service.create(orgId, dto);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Email template fetched successfully')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Email template updated successfully')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Email template deleted successfully')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post(':id/duplicate')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  @ResponseMessage('Email template duplicated successfully')
  duplicate(@Param('id') id: string) {
    return this.service.duplicate(id);
  }

  @Post('send')
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
  )
  @ResponseMessage('Email sent successfully')
  sendEmail(@Body() dto: SendEmailTemplateDto) {
    return this.service.sendEmail(dto);
  }
}
