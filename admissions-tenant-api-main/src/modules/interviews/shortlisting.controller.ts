import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ScoringService } from './scoring.service.js';
import { RunShortlistingDto } from './dto/run-shortlisting.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/shortlisting')
export class ShortlistingController {
  constructor(private readonly scoringService: ScoringService) {}

  // Preview mode (default): computes and returns scores for every matching
  // application without writing anything — this is what the exam_manager
  // reviews before committing (Sprint A6 in the plan).
  // Commit mode (dto.commit === true): re-runs the same computation and
  // persists shortlistScore/shortlistStatus onto each Application.
  @Post('run')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER)
  async run(@Param('orgId') orgId: string, @Body() dto: RunShortlistingDto, @Request() req) {
    if (dto.commit) {
      return this.scoringService.commitShortlisting(orgId, dto.ruleId, req.user.sub);
    }
    return this.scoringService.previewShortlisting(orgId, dto.ruleId);
  }
}
