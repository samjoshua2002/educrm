import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { RejectionService } from './rejection.service.js';
import { UpdateRejectionDto } from './dto/update-rejection.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/applications/:applicationNo/rejection')
export class RejectionController {
  constructor(private readonly rejectionService: RejectionService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER, Role.COUNSELOR)
  getRejection(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.rejectionService.getRejection(orgId, applicationNo);
  }

  // Upserts the rejection record — used both to create one standalone (a
  // rejection outside the decision workflow) and to refine the
  // auto-created record's detailed reason afterward.
  @Patch()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  updateRejection(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: UpdateRejectionDto,
  ) {
    return this.rejectionService.createRejectionRecord(orgId, applicationNo, dto);
  }
}
