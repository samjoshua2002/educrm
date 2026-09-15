import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { EmailTemplateCategoriesService } from './email-template-categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateVariableDto } from './dto/create-variable.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('email-template-categories')
export class EmailTemplateCategoriesController {
  constructor(private readonly service: EmailTemplateCategoriesService) {}

  @Get()
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
  )
  @ResponseMessage('Email template categories fetched successfully')
  findAll(@Query('orgId') orgId?: string, @Request() req?: any) {
    const effectiveOrgId = orgId || req?.user?.organizationId;
    return this.service.findAll(effectiveOrgId);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Email template category fetched successfully')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Email template category created successfully')
  create(@Body() dto: CreateCategoryDto, @Request() req: any) {
    const orgId = req.user?.role === Role.SUPERADMIN ? null : req.user?.organizationId;
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Email template category updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Email template category deleted successfully')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/variables')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Variable added successfully')
  addVariable(@Param('id') id: string, @Body() dto: CreateVariableDto) {
    return this.service.addVariable(id, dto);
  }

  @Delete(':id/variables/:varId')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Variable removed successfully')
  removeVariable(@Param('id') id: string, @Param('varId') varId: string) {
    return this.service.removeVariable(id, varId);
  }
}
