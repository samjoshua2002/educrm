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
  Query,
} from '@nestjs/common';
import { CourseSessionsService } from './course-sessions.service.js';
import { CreateCourseSessionDto } from './dto/create-course-session.dto.js';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/course-sessions')
export class CourseSessionsController {
  constructor(private readonly courseSessionsService: CourseSessionsService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  create(
    @Param('orgId') orgId: string,
    @Body() createDto: CreateCourseSessionDto,
    @Request() req
  ) {
    return this.courseSessionsService.create(orgId, createDto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  findAll(
    @Param('orgId') orgId: string,
    @Query('courseId') courseId?: string,
    @Query('academicSessionId') academicSessionId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters = {
      courseId,
      academicSessionId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    };
    return this.courseSessionsService.findAllByOrg(orgId, filters);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.courseSessionsService.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  update(
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Body() updateDto: UpdateCourseSessionDto,
    @Request() req
  ) {
    return this.courseSessionsService.update(id, orgId, updateDto, req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  remove(
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Request() req
  ) {
    return this.courseSessionsService.remove(id, orgId, req.user.sub);
  }
}
