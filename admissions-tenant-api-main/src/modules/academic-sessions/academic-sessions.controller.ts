import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AcademicSessionsService } from './academic-sessions.service.js';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto.js';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/academic-sessions')
export class AcademicSessionsController {
  constructor(private readonly academicSessionsService: AcademicSessionsService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  create(
    @Param('orgId') orgId: string,
    @Body() createAcademicSessionDto: CreateAcademicSessionDto,
    @Request() req
  ) {
    return this.academicSessionsService.create(orgId, createAcademicSessionDto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  findAll(@Param('orgId') orgId: string) {
    return this.academicSessionsService.findAllByOrg(orgId);
  }

  @Get('current')
  findCurrent(@Param('orgId') orgId: string) {
    return this.academicSessionsService.findCurrentSession(orgId);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.academicSessionsService.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  update(
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Body() updateAcademicSessionDto: UpdateAcademicSessionDto,
    @Request() req
  ) {
    return this.academicSessionsService.update(id, orgId, updateAcademicSessionDto, req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  remove(
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Request() req
  ) {
    return this.academicSessionsService.remove(id, orgId, req.user.sub);
  }
}
