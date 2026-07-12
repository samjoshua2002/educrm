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
import { CoursesService } from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  create(
    @Param('orgId') orgId: string,
    @Body() createCourseDto: CreateCourseDto,
    @Request() req
  ) {
    return this.coursesService.create(orgId, createCourseDto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  findAll(
    @Param('orgId') orgId: string,
    @Query('isActive') isActive?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
  ) {
    const filters = {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      department,
      search,
    };
    return this.coursesService.findAllByOrg(orgId, filters);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  findOne(@Param('id') id: string, @Param('orgId') orgId: string) {
    return this.coursesService.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  update(
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Request() req
  ) {
    return this.coursesService.update(id, orgId, updateCourseDto, req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  remove(
    @Param('id') id: string,
    @Param('orgId') orgId: string,
    @Request() req
  ) {
    return this.coursesService.remove(id, orgId, req.user.sub);
  }

  @Delete(':id/hard-delete')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  hardDelete(
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    return this.coursesService.hardDelete(id, orgId);
  }
}
