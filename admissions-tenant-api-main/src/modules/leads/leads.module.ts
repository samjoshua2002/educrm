import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity.js';
import { LeadActivity } from './entities/lead-activity.entity.js';
import { LeadScoringRule } from './entities/lead-scoring-rule.entity.js';
import { LeadRoutingRule } from './entities/lead-routing-rule.entity.js';
import { LeadManagementSettings } from './entities/lead-management-settings.entity.js';
import { LeadsService } from './leads.service.js';
import { LeadIngestionService } from './lead-ingestion.service.js';
import { LeadAssignmentService } from './lead-assignment.service.js';
import { LeadSettingsService } from './lead-settings.service.js';
import { LeadScoringService } from './lead-scoring.service.js';
import { LeadDuplicateService } from './lead-duplicate.service.js';
import { LeadSourceTrackingService } from './lead-source-tracking.service.js';
import { LeadPipelineService } from './lead-pipeline.service.js';
import { LeadsController } from './leads.controller.js';
import { LeadManagementController } from './lead-management.controller.js';
import { Form } from '../forms/entities/form.entity.js';
import { FormSubmission } from '../forms/entities/form-submission.entity.js';
import { FormStats } from '../forms/entities/form-stats.entity.js';
import { FormDailyStats } from '../forms/entities/form-daily-stats.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { AcademicSession } from '../academic-sessions/entities/academic-session.entity.js';
import { MarketingCampaign } from '../campaigns/entities/marketing-campaign.entity.js';

import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      LeadActivity,
      LeadScoringRule,
      LeadRoutingRule,
      LeadManagementSettings,
      Form,
      FormSubmission,
      FormStats,
      FormDailyStats,
      User,
      Course,
      AcademicSession,
      MarketingCampaign,
    ]),
    NotificationsModule,
  ],
  controllers: [LeadsController, LeadManagementController],
  providers: [
    LeadsService,
    LeadIngestionService,
    LeadAssignmentService,
    LeadSettingsService,
    LeadScoringService,
    LeadDuplicateService,
    LeadSourceTrackingService,
    LeadPipelineService,
  ],
  exports: [
    LeadsService,
    LeadIngestionService,
    LeadAssignmentService,
    LeadSettingsService,
    LeadScoringService,
    LeadDuplicateService,
    LeadSourceTrackingService,
    LeadPipelineService,
  ],
})
export class LeadsModule {}
