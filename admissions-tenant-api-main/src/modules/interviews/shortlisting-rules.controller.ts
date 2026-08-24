import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ShortlistingRulesService } from './shortlisting-rules.service.js';
import { CreateShortlistingRuleDto } from './dto/create-shortlisting-rule.dto.js';
import { UpdateShortlistingRuleDto } from './dto/update-shortlisting-rule.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/shortlisting-rules')
export class ShortlistingRulesController {
  constructor(private readonly rulesService: ShortlistingRulesService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  create(@Param('orgId') orgId: string, @Body() dto: CreateShortlistingRuleDto, @Request() req) {
    return this.rulesService.create(orgId, dto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  findAll(
    @Param('orgId') orgId: string,
    @Query('program') program?: string,
    @Query('academicYear') academicYear?: string,
    @Query('status') status?: string,
  ) {
    return this.rulesService.findAllByOrg(orgId, { program, academicYear, status });
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.rulesService.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  update(@Param('id') id: string, @Param('orgId') orgId: string, @Body() dto: UpdateShortlistingRuleDto, @Request() req) {
    return this.rulesService.update(id, orgId, dto, req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  deactivate(@Param('id') id: string, @Param('orgId') orgId: string, @Request() req) {
    return this.rulesService.deactivate(id, orgId, req.user.sub);
  }

  @Delete(':id/hard-delete')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  hardDelete(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.rulesService.hardDelete(id, orgId);
  }
}
