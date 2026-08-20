import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { SlotsService } from './slots.service.js';
import { CreateSlotDto } from './dto/create-slot.dto.js';
import { BulkCreateSlotsDto } from './dto/bulk-create-slots.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/interview-slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  create(@Param('orgId') orgId: string, @Body() dto: CreateSlotDto, @Request() req) {
    return this.slotsService.create(orgId, dto, req.user.sub);
  }

  @Post('bulk')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  bulkCreate(@Param('orgId') orgId: string, @Body() dto: BulkCreateSlotsDto, @Request() req) {
    return this.slotsService.bulkCreate(orgId, dto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  findAll(
    @Param('orgId') orgId: string,
    @Query('interviewerId') interviewerId?: string,
    @Query('interviewType') interviewType?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.slotsService.findAllByOrg(orgId, { interviewerId, interviewType, status, dateFrom, dateTo });
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.slotsService.findOne(id, orgId);
  }

  @Patch(':id/block')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  block(@Param('id') id: string, @Param('orgId') orgId: string, @Request() req) {
    return this.slotsService.block(id, orgId, req.user.sub);
  }

  @Patch(':id/unblock')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  unblock(@Param('id') id: string, @Param('orgId') orgId: string, @Request() req) {
    return this.slotsService.unblock(id, orgId, req.user.sub);
  }

  @Patch(':id/cancel')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  cancel(@Param('id') id: string, @Param('orgId') orgId: string, @Request() req) {
    return this.slotsService.cancel(id, orgId, req.user.sub);
  }
}
