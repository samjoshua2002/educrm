import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Request,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(Role.SUPERADMIN)
  @ResponseMessage('Organization created successfully')
  create(@Body() dto: CreateOrganizationDto, @Request() req: any) {
    return this.organizationsService.create(dto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN)
  @ResponseMessage('Organizations fetched successfully')
  findAll(@Query() paginationDto: PaginationDto) {
    return this.organizationsService.findAll(paginationDto);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Organization details fetched successfully')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const user = req.user;

    // Org Admins can only view their own organization
    if (user.role === Role.ORG_ADMIN && user.organizationId !== id) {
      throw new ForbiddenException(
        'Access denied: You can only view your own organization',
      );
    }

    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Organization updated successfully')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @Request() req: any,
  ) {
    const user = req.user;

    // Org Admins can only edit their own organization
    if (user.role === Role.ORG_ADMIN && user.organizationId !== id) {
      throw new ForbiddenException(
        'Access denied: You can only edit your own organization',
      );
    }

    return this.organizationsService.update(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN)
  @ResponseMessage('Organization deleted successfully')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.remove(id);
  }
}
