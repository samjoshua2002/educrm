import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationSettingsService } from './organization-settings.service.js';
import { UpdateIntegrationSettingsDto } from './dto/update-integration-settings.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('organizations/:orgId/integration-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationSettingsController {
  constructor(private readonly service: OrganizationSettingsService) {}

  private assertAccess(orgId: string, user: any) {
    if (user.role === Role.ORG_ADMIN && user.organizationId !== orgId) {
      throw new ForbiddenException(
        'Access denied: You can only access your own organization settings',
      );
    }
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Integration settings fetched successfully')
  async findOne(@Param('orgId', ParseUUIDPipe) orgId: string, @Request() req: any) {
    this.assertAccess(orgId, req.user);
    const settings = await this.service.findByOrg(orgId);
    return settings || { organizationId: orgId };
  }

  @Patch()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Integration settings updated successfully')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: UpdateIntegrationSettingsDto,
    @Request() req: any,
  ) {
    this.assertAccess(orgId, req.user);
    return this.service.upsert(orgId, dto);
  }
}
