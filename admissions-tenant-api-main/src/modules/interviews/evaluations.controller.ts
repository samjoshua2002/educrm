import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service.js';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations/:orgId/interviews')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get('my-assignments')
  getMyAssignments(@Param('orgId') orgId: string, @Request() req) {
    return this.evaluationsService.getMyAssignedInterviews(orgId, req.user.sub);
  }

  @Get(':interviewId/rubrics')
  getRubrics(@Param('orgId') orgId: string, @Param('interviewId') interviewId: string) {
    return this.evaluationsService.getRubricsForInterview(orgId, interviewId);
  }

  @Get(':interviewId/evaluations/mine')
  getMyEvaluation(@Param('orgId') orgId: string, @Param('interviewId') interviewId: string, @Request() req) {
    return this.evaluationsService.getOrCreateDraftEvaluation(orgId, interviewId, req.user.sub, req.user.role);
  }

  @Patch(':interviewId/evaluations/mine')
  submitMyEvaluation(
    @Param('orgId') orgId: string,
    @Param('interviewId') interviewId: string,
    @Body() dto: SubmitEvaluationDto,
    @Request() req,
  ) {
    return this.evaluationsService.submitScores(orgId, interviewId, req.user.sub, req.user.role, dto);
  }

  @Get(':interviewId/evaluations')
  getAllEvaluations(@Param('orgId') orgId: string, @Param('interviewId') interviewId: string, @Request() req) {
    return this.evaluationsService.getInterviewEvaluations(orgId, interviewId, req.user.sub, req.user.role);
  }
}
