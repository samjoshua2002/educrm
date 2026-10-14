import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { CampaignsService } from './campaigns.service.js';
import {
  CampaignQueryDto,
  CreateCampaignDto,
  PerformanceQueryDto,
  UpdateCampaignDto,
} from './dto/campaign.dto.js';

@Controller('organizations/:orgId/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Campaigns fetched successfully')
  findAll(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: CampaignQueryDto) {
    return this.campaigns.findAll(orgId, q);
  }

  /** Channel performance & ROI for the leads / campaigns pages */
  @Get('performance')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Channel performance fetched successfully')
  performance(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() q: PerformanceQueryDto) {
    return this.campaigns.performance(orgId, q);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Campaign fetched successfully')
  findOne(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.findOne(orgId, id);
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Campaign created successfully')
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateCampaignDto,
    @Request() req: any,
  ) {
    return this.campaigns.create(orgId, req.user.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Campaign updated successfully')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaigns.update(orgId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Campaign deleted successfully')
  remove(@Param('orgId', ParseUUIDPipe) orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.remove(orgId, id);
  }
}
