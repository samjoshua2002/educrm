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
} from '@nestjs/common';
import { FormsService } from './forms.service.js';
import { CreateFormDto } from './dto/create-form.dto.js';
import { UpdateFormDto } from './dto/update-form.dto.js';
import { FormQueryDto } from './dto/form-query.dto.js';
import { ResponseQueryDto } from './dto/response-query.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { FormStatus } from './entities/form.entity.js';
import { ResponseStatus } from './entities/form-response.entity.js';

@Controller('organizations/:orgId/forms')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Form created successfully')
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateFormDto,
    @Request() req: any,
  ) {
    return this.formsService.create(orgId, dto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Forms fetched successfully')
  findAll(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() queryDto: FormQueryDto,
  ) {
    return this.formsService.findAllByOrg(orgId, queryDto, queryDto.search, queryDto.status);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Form details fetched successfully')
  findOne(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.formsService.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Form updated successfully')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormDto,
  ) {
    return this.formsService.update(id, orgId, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Form deleted successfully')
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.formsService.remove(id, orgId);
  }

  @Post(':id/duplicate')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Form duplicated successfully')
  duplicate(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.formsService.duplicate(id, orgId, req.user.sub);
  }

  @Get(':id/responses')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Form responses fetched successfully')
  findResponses(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() queryDto: ResponseQueryDto,
  ) {
    return this.formsService.findResponsesByForm(id, orgId, queryDto, queryDto.search, queryDto.status);
  }
}
