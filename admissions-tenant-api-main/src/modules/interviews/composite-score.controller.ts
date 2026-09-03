import { Controller, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ScoringService } from './scoring.service.js';
import { ScoreAdjustmentDto } from './dto/score-adjustment.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

// Stage 2 — composite score rollup, exposed for the GD/PI admin detail page.
// applicationNo is passed as a QUERY parameter (?applicationNo=CITY/2026/1012)
// instead of a path segment to avoid Express route-matching issues with
// slash-containing application numbers like CITY/2026/1012.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId')
export class CompositeScoreController {
  constructor(private readonly scoringService: ScoringService) {}

  // Full breakdown (per-interview scores, experience component,
  // achievement/penalty, gdpiTotal, compositeScore, discrepancyFlag) —
  // always compute-and-return, never just the raw Application columns.
  @Get('composite-score')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER, Role.EXAM_MANAGER, Role.COUNSELOR)
  getCompositeScore(
    @Param('orgId') orgId: string,
    @Query('applicationNo') applicationNo: string,
  ) {
    return this.scoringService.getCompositeScoreBreakdown(orgId, applicationNo);
  }

  @Patch('score-adjustment')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER)
  applyScoreAdjustment(
    @Param('orgId') orgId: string,
    @Query('applicationNo') applicationNo: string,
    @Body() dto: ScoreAdjustmentDto,
    @Request() req,
  ) {
    return this.scoringService.applyScoreAdjustment(orgId, applicationNo, dto, req.user.sub);
  }
}
