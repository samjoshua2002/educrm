import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ScoringService } from './scoring.service.js';
import { ScoreAdjustmentDto } from './dto/score-adjustment.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

// Stage 2 — composite score rollup, exposed for the GD/PI admin detail page
// (replaces the old client-side fabricated "Composite Score Banner" calc).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/applications/:applicationNo')
export class CompositeScoreController {
  constructor(private readonly scoringService: ScoringService) {}

  // Full breakdown (per-interview scores, experience component,
  // achievement/penalty, gdpiTotal, compositeScore, discrepancyFlag) —
  // always compute-and-return, never just the raw Application columns.
  @Get('composite-score')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER, Role.COUNSELOR)
  getCompositeScore(@Param('orgId') orgId: string, @Param('applicationNo') applicationNo: string) {
    return this.scoringService.getCompositeScoreBreakdown(orgId, applicationNo);
  }

  @Patch('score-adjustment')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  applyScoreAdjustment(
    @Param('orgId') orgId: string,
    @Param('applicationNo') applicationNo: string,
    @Body() dto: ScoreAdjustmentDto,
    @Request() req,
  ) {
    return this.scoringService.applyScoreAdjustment(orgId, applicationNo, dto, req.user.sub);
  }
}
