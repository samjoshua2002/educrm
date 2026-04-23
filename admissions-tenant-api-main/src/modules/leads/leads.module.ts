import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity.js';
import { LeadsService } from './leads.service.js';
import { LeadIngestionService } from './lead-ingestion.service.js';
import { LeadAssignmentService } from './lead-assignment.service.js';
import { LeadsController } from './leads.controller.js';
import { Form } from '../forms/entities/form.entity.js';
import { FormSubmission } from '../forms/entities/form-submission.entity.js';
import { FormStats } from '../forms/entities/form-stats.entity.js';
import { FormDailyStats } from '../forms/entities/form-daily-stats.entity.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      Form,
      FormSubmission,
      FormStats,
      FormDailyStats,
      User,
    ]),
  ],
  controllers: [LeadsController],
  providers: [LeadsService, LeadIngestionService, LeadAssignmentService],
  exports: [LeadsService, LeadIngestionService, LeadAssignmentService],
})
export class LeadsModule {}
