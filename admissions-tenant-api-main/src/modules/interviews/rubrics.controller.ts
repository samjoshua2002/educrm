import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { RubricsService } from './rubrics.service.js';
import { CreateRubricDto } from './dto/create-rubric.dto.js';
import { UpdateRubricDto } from './dto/update-rubric.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/evaluation-rubrics')
export class RubricsController {
  constructor(private readonly rubricsService: RubricsService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  create(@Param('orgId') orgId: string, @Body() dto: CreateRubricDto, @Request() req) {
    return this.rubricsService.create(orgId, dto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  findAll(@Param('orgId') orgId: string, @Query('interviewType') interviewType?: string) {
    return this.rubricsService.findAllByOrg(orgId, interviewType);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.rubricsService.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  update(@Param('id') id: string, @Param('orgId') orgId: string, @Body() dto: UpdateRubricDto, @Request() req) {
    return this.rubricsService.update(id, orgId, dto, req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  deactivate(@Param('id') id: string, @Param('orgId') orgId: string, @Request() req) {
    return this.rubricsService.deactivate(id, orgId, req.user.sub);
  }

  @Delete(':id/hard-delete')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  hardDelete(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.rubricsService.hardDelete(id, orgId);
  }
}
