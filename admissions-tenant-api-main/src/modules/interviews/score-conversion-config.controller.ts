import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ScoreConversionConfigService } from './score-conversion-config.service.js';
import { UpdateScoreConversionConfigDto } from './dto/update-score-conversion-config.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/score-conversion-config')
export class ScoreConversionConfigController {
  constructor(private readonly configService: ScoreConversionConfigService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  get(@Param('orgId') orgId: string) {
    return this.configService.getOrCreate(orgId);
  }

  @Patch()
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  update(@Param('orgId') orgId: string, @Body() dto: UpdateScoreConversionConfigDto, @Request() req) {
    return this.configService.update(orgId, dto, req.user.sub);
  }
}
