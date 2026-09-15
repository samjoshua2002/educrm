import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommunicationsService } from './communications.service.js';
import { CreateCommunicationLogDto } from './dto/create-communication-log.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Get()
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
  )
  @ResponseMessage('Communication logs fetched successfully')
  findAll(
    @Query('applicationNo') applicationNo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const orgId = req?.user?.organizationId;
    return this.service.findAll(
      orgId,
      applicationNo,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get(':id')
  @Roles(
    Role.SUPERADMIN,
    Role.ORG_ADMIN,
    Role.APPLICATION_MANAGER,
    Role.COUNSELOR,
    Role.LEAD_MANAGER,
  )
  @ResponseMessage('Communication log fetched successfully')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.COUNSELOR, Role.LEAD_MANAGER)
  @ResponseMessage('Communication logged successfully')
  create(@Body() dto: CreateCommunicationLogDto) {
    return this.service.create(dto);
  }
}
