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
import { BranchesService } from './branches.service.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('organizations/:orgId/branches')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Branch created successfully')
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateBranchDto,
    @Request() req: any,
  ) {
    return this.branchesService.create(orgId, dto, req.user.sub);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Branches fetched successfully')
  findAll(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.branchesService.findAllByOrg(orgId, paginationDto);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Branch details fetched successfully')
  findOne(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchesService.findOne(id, orgId);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Branch updated successfully')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @Request() req: any,
  ) {
    return this.branchesService.update(id, orgId, dto, req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Branch deleted successfully')
  remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchesService.remove(id, orgId);
  }
}
