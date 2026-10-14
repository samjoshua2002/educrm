import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { LeadSettingsService } from './lead-settings.service.js';
import { LeadScoringService } from './lead-scoring.service.js';
import { LeadAssignmentService } from './lead-assignment.service.js';
import { LeadDuplicateService } from './lead-duplicate.service.js';
import { Lead } from './entities/lead.entity.js';
import { SCORING_CATEGORIES } from './entities/lead-scoring-rule.entity.js';
import {
  LeadSettingsDto,
  MergeLeadsDto,
  ReorderRulesDto,
  RoutingRuleDto,
  ScoringRuleDto,
  UpdateRoutingRuleDto,
  UpdateScoringRuleDto,
} from './dto/lead-management.dto.js';

/** Configuration for scoring, routing and duplicate management (scope 3–5). */
@Controller('organizations/:orgId/lead-management')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class LeadManagementController {
  constructor(
    private readonly settings: LeadSettingsService,
    private readonly scoring: LeadScoringService,
    private readonly routing: LeadAssignmentService,
    private readonly duplicates: LeadDuplicateService,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
  ) {}

  // ---- settings ----------------------------------------------------------

  @Get('settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.COUNSELOR)
  @ResponseMessage('Lead management settings fetched')
  getSettings(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.settings.get(orgId);
  }

  @Patch('settings')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Lead management settings updated')
  updateSettings(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: LeadSettingsDto) {
    return this.settings.update(orgId, dto as any);
  }

  // ---- scoring -----------------------------------------------------------

  @Get('scoring/meta')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Scoring metadata fetched')
  scoringMeta() {
    return { attributes: LeadScoringService.ATTRIBUTES, categories: [...SCORING_CATEGORIES, 'Other'] };
  }

  @Get('scoring/rules')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Scoring rules fetched')
  listScoringRules(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.scoring.listRules(orgId);
  }

  @Post('scoring/rules')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Scoring rule created')
  createScoringRule(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: ScoringRuleDto) {
    return this.scoring.createRule(orgId, dto as any);
  }

  @Patch('scoring/rules/:ruleId')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Scoring rule updated')
  updateScoringRule(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateScoringRuleDto,
  ) {
    return this.scoring.updateRule(orgId, ruleId, dto as any);
  }

  @Delete('scoring/rules/:ruleId')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Scoring rule deleted')
  async deleteScoringRule(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ) {
    await this.scoring.deleteRule(orgId, ruleId);
    return { deleted: true };
  }

  @Post('scoring/rescore-all')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('All leads rescored')
  rescoreAll(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.scoring.rescoreAll(orgId);
  }

  @Get('scoring/summary')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Score distribution fetched')
  async scoringSummary(@Param('orgId', ParseUUIDPipe) orgId: string) {
    const rows: { band: string | null; cnt: string; avg: string | null }[] = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.score_band', 'band')
      .addSelect('COUNT(*)', 'cnt')
      .addSelect('AVG(lead.score)', 'avg')
      .where('lead.organization_id = :orgId', { orgId })
      .andWhere("lead.status != 'merged'")
      .groupBy('lead.score_band')
      .getRawMany();
    const out = { hot: 0, warm: 0, cold: 0, unscored: 0, averageScore: 0 };
    let total = 0;
    let sum = 0;
    for (const r of rows) {
      const n = Number(r.cnt);
      if (r.band === 'hot' || r.band === 'warm' || r.band === 'cold') out[r.band] = n;
      else out.unscored += n;
      if (r.avg !== null) {
        total += n;
        sum += Number(r.avg) * n;
      }
    }
    out.averageScore = total ? Math.round((sum / total) * 10) / 10 : 0;
    return out;
  }

  // ---- routing -----------------------------------------------------------

  @Get('routing/rules')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Routing rules fetched')
  async listRoutingRules(@Param('orgId', ParseUUIDPipe) orgId: string) {
    const rules = await this.routing.listRules(orgId);
    return rules.map((r) => ({ ...r, description: this.routing.describeRule(r) }));
  }

  @Post('routing/rules')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Routing rule created')
  createRoutingRule(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: RoutingRuleDto) {
    return this.routing.createRule(orgId, dto as any);
  }

  @Patch('routing/rules/:ruleId')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Routing rule updated')
  updateRoutingRule(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateRoutingRuleDto,
  ) {
    return this.routing.updateRule(orgId, ruleId, dto as any);
  }

  @Delete('routing/rules/:ruleId')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Routing rule deleted')
  async deleteRoutingRule(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ) {
    await this.routing.deleteRule(orgId, ruleId);
    return { deleted: true };
  }

  @Post('routing/reorder')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN)
  @ResponseMessage('Routing rules reordered')
  reorder(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: ReorderRulesDto) {
    return this.routing.reorder(orgId, dto.ids);
  }

  // ---- duplicates --------------------------------------------------------

  @Get('duplicates')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Potential duplicates fetched')
  listDuplicates(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.duplicates.listFlagged(orgId);
  }

  /** On-demand scan for one lead (exact + fuzzy rules). */
  @Get('duplicates/scan/:leadId')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Duplicate scan complete')
  async scan(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
  ) {
    const lead = await this.leadRepo.findOne({ where: { id: leadId, organizationId: orgId } });
    if (!lead) throw new NotFoundException('Lead not found');
    const matches = await this.duplicates.findMatches(
      { ...lead, organizationId: orgId },
      { fuzzy: true, excludeIds: [leadId] },
    );
    return {
      matches: matches.map((m) => ({
        confidence: m.confidence,
        reasons: m.reasons,
        lead: {
          id: m.lead.id,
          firstName: m.lead.firstName,
          lastName: m.lead.lastName,
          email: m.lead.email,
          phone: m.lead.phone,
          city: m.lead.city,
          channelSource: m.lead.channelSource,
          createdAt: m.lead.createdAt,
          status: m.lead.status,
        },
      })),
    };
  }

  @Get('duplicates/preview')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Merge preview generated')
  preview(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query('masterId', ParseUUIDPipe) masterId: string,
    @Query('duplicateId', ParseUUIDPipe) duplicateId: string,
  ) {
    return this.duplicates.preview(orgId, masterId, duplicateId);
  }

  @Post('duplicates/merge')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Leads merged successfully')
  merge(@Param('orgId', ParseUUIDPipe) orgId: string, @Body() dto: MergeLeadsDto, @Request() req: any) {
    return this.duplicates.merge(orgId, req.user.sub, dto.masterLeadId, dto.duplicateLeadId, dto.choices || {});
  }

  @Post('duplicates/:leadId/dismiss')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER)
  @ResponseMessage('Duplicate flag cleared')
  dismiss(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Request() req: any,
  ) {
    return this.duplicates.dismiss(orgId, leadId, req.user.sub);
  }
}
