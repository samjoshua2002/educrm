import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { GdScoringSchemesService } from './gd-scoring-schemes.service.js';
import { ScoringService } from './scoring.service.js';
import { SaveGdSchemeDto, SaveComponentScoresDto } from './dto/gd-scoring-scheme.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';

// Owner request: customizable GD/PI scoring. The predefined Standard
// template (id 'standard') is always listed first and can be re-selected.
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('organizations/:orgId')
export class GdScoringSchemesController {
  constructor(
    private readonly schemesService: GdScoringSchemesService,
    private readonly scoringService: ScoringService,
  ) {}

  @Get('gd-scoring-schemes')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  list(@Param('orgId') orgId: string) {
    return this.schemesService.list(orgId);
  }

  @Get('gd-scoring-schemes/active')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER, Role.APPLICATION_MANAGER, Role.COUNSELOR)
  active(@Param('orgId') orgId: string) {
    return this.schemesService.getActiveScheme(orgId);
  }

  @Post('gd-scoring-schemes')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Scoring scheme created')
  create(@Param('orgId') orgId: string, @Body() dto: SaveGdSchemeDto, @Request() req) {
    return this.schemesService.create(orgId, dto, req.user.sub);
  }

  @Patch('gd-scoring-schemes/:id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Scoring scheme updated')
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: SaveGdSchemeDto, @Request() req) {
    return this.schemesService.update(orgId, id, dto, req.user.sub);
  }

  @Post('gd-scoring-schemes/:id/select')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Scoring scheme selected')
  select(@Param('orgId') orgId: string, @Param('id') id: string, @Request() req) {
    return this.schemesService.select(orgId, id, req.user.sub);
  }

  @Delete('gd-scoring-schemes/:id')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Scoring scheme deleted')
  remove(@Param('orgId') orgId: string, @Param('id') id: string, @Request() req) {
    return this.schemesService.remove(orgId, id, req.user.sub);
  }

  // Marks entered on the candidate's GD & Interview page for the selected
  // scheme. applicationNo is a query parameter because it contains slashes.
  @Patch('component-scores')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.EXAM_MANAGER, Role.APPLICATION_MANAGER)
  @ResponseMessage('Scores saved')
  async saveComponentScores(
    @Param('orgId') orgId: string,
    @Query('applicationNo') applicationNo: string,
    @Body() dto: SaveComponentScoresDto,
    @Request() req,
  ) {
    const application = await this.schemesService.saveComponentScores(orgId, applicationNo, dto, req.user.sub);
    return this.scoringService.computeCompositeScore(orgId, application.id);
  }
}
