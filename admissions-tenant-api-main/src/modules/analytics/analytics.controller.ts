import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { AnalyticsService, DEFAULT_SLA_HOURS } from './analytics.service.js';
import { DashboardService } from './dashboard.service.js';
import { PlatformAnalyticsService } from './platform-analytics.service.js';
import { PlatformAlertsService } from './platform-alerts.service.js';
import { normalizeFilters } from './analytics-sql.js';

const STAFF = [
  Role.SUPERADMIN,
  Role.ORG_ADMIN,
  Role.LEAD_MANAGER,
  Role.COUNSELOR,
  Role.APPLICATION_MANAGER,
  Role.EXAM_MANAGER,
];
const REPORT_ROLES = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.APPLICATION_MANAGER, Role.COUNSELOR];

/**
 * Reporting & analytics for one organization.
 * Query filters (all optional): from, to (YYYY-MM-DD), courseId, branchId,
 * academicSession, counselorId. Counselors are always limited to their own data.
 */
@Controller('organizations/:orgId/analytics')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly dashboards: DashboardService,
  ) {}

  private filters(query: any, req: any) {
    const f = normalizeFilters(query);
    if (req?.user?.role === Role.COUNSELOR) f.counselorId = req.user.sub;
    return f;
  }

  @Get('filter-options')
  @Roles(...STAFF)
  @ResponseMessage('Analytics filter options fetched successfully')
  filterOptions(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.analytics.filterOptions(orgId);
  }

  @Get('dashboard')
  @Roles(...STAFF)
  @ResponseMessage('Dashboard fetched successfully')
  dashboard(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: any,
    @Request() req: any,
  ) {
    return this.dashboards.dashboard(
      orgId,
      { sub: req.user.sub, role: req.user.role },
      query?.view,
      normalizeFilters(query),
    );
  }

  @Get('funnel')
  @Roles(...REPORT_ROLES)
  @ResponseMessage('Funnel analytics fetched successfully')
  funnel(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() query: any, @Request() req: any) {
    return this.analytics.funnel(orgId, this.filters(query, req));
  }

  @Get('campaigns')
  @Roles(Role.SUPERADMIN, Role.ORG_ADMIN, Role.LEAD_MANAGER, Role.APPLICATION_MANAGER)
  @ResponseMessage('Campaign performance fetched successfully')
  campaigns(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() query: any, @Request() req: any) {
    return this.analytics.campaigns(orgId, this.filters(query, req));
  }

  @Get('geography')
  @Roles(...REPORT_ROLES)
  @ResponseMessage('Geographic & demographic insights fetched successfully')
  geography(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() query: any, @Request() req: any) {
    return this.analytics.geography(orgId, this.filters(query, req));
  }

  @Get('counselors')
  @Roles(...REPORT_ROLES)
  @ResponseMessage('Counselor performance fetched successfully')
  counselors(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: any,
    @Request() req: any,
  ) {
    const sla = Number(query?.slaHours);
    return this.analytics.counselors(
      orgId,
      this.filters(query, req),
      Number.isFinite(sla) && sla > 0 ? sla : DEFAULT_SLA_HOURS,
    );
  }

  @Get('trend')
  @Roles(...REPORT_ROLES)
  @ResponseMessage('Trend fetched successfully')
  trend(@Param('orgId', ParseUUIDPipe) orgId: string, @Query() query: any, @Request() req: any) {
    return this.analytics.monthlyTrend(orgId, this.filters(query, req));
  }
}

/** Platform-wide analytics and alerts for the superadmin portal. */
@Controller('superadmin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuperadminAnalyticsController {
  constructor(
    private readonly platform: PlatformAnalyticsService,
    private readonly alerts: PlatformAlertsService,
  ) {}

  @Get('overview')
  @Roles(Role.SUPERADMIN)
  @ResponseMessage('Platform overview fetched successfully')
  overview() {
    return this.platform.overview();
  }

  @Post('alerts/run')
  @Roles(Role.SUPERADMIN)
  @ResponseMessage('Platform alert check completed')
  runAlerts() {
    return this.alerts.run();
  }
}
