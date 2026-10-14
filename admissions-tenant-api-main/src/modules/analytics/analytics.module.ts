import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { DashboardService } from './dashboard.service.js';
import { PlatformAnalyticsService } from './platform-analytics.service.js';
import { PlatformAlertsService } from './platform-alerts.service.js';
import { AnalyticsController, SuperadminAnalyticsController } from './analytics.controller.js';

/**
 * Reporting & analytics (funnel, campaigns, geography/demographics,
 * counselor performance), role-based dashboards, the superadmin platform
 * overview and the cron that raises platform alerts.
 * Reads the other modules' tables with SQL through the DataSource, so it
 * needs no entity imports. InAppNotificationsService is global.
 */
@Module({
  controllers: [AnalyticsController, SuperadminAnalyticsController],
  providers: [AnalyticsService, DashboardService, PlatformAnalyticsService, PlatformAlertsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
