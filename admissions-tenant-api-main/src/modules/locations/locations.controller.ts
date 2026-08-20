import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { LocationsService } from './locations.service.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // Mutations are org_admin only (superadmin kept as platform-level
  // override, matching every other CRUD module in this codebase — e.g.
  // Courses, Branches, ShortlistingRules).
  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  create(@Param('orgId') orgId: string, @Body() dto: CreateLocationDto, @Request() req) {
    return this.locationsService.create(orgId, dto, req.user.sub);
  }

  // Read access is broader — exam_manager needs this list to populate the
  // interview-slot location dropdown.
  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  findAll(
    @Param('orgId') orgId: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.locationsService.findAllByOrg(orgId, {
      type,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.locationsService.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  update(@Param('id') id: string, @Param('orgId') orgId: string, @Body() dto: UpdateLocationDto, @Request() req) {
    return this.locationsService.update(id, orgId, dto, req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  remove(@Param('id') id: string, @Param('orgId') orgId: string, @Request() req) {
    return this.locationsService.remove(id, orgId, req.user.sub);
  }

  @Delete(':id/hard-delete')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  hardDelete(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.locationsService.hardDelete(id, orgId);
  }
}
