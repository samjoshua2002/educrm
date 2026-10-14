import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './entities/application.entity.js';
import { Student } from './entities/student.entity.js';
import { ApplicationEducation } from './entities/application-education.entity.js';
import { ApplicationEntranceTest } from './entities/application-entrance-test.entity.js';
import { ApplicationWorkExperience } from './entities/application-work-experience.entity.js';
import { ApplicationParent } from './entities/application-parent.entity.js';
import { ApplicationAddress } from './entities/application-address.entity.js';
import { ApplicationExtraCurricular } from './entities/application-extra-curricular.entity.js';
import { ApplicationOtherQualification } from './entities/application-other-qualification.entity.js';
import { ApplicationActivity } from './entities/application-activity.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { ApplicationsService } from './applications.service.js';
import { ApplicationsController } from './applications.controller.js';
import { LeadsModule } from '../leads/leads.module.js';
import { CoursesModule } from '../courses/courses.module.js';
import { EmailTemplatesModule } from '../email-templates/email-templates.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ApplicationStatusLog } from './entities/application-status-log.entity.js';
import { ApplicationWorkflowSettings } from './entities/application-workflow-settings.entity.js';
import { ApplicationDocument } from '../documents/entities/application-document.entity.js';
import { User } from '../users/entities/user.entity.js';
import { ApplicationStatusService } from './application-status.service.js';
import { ApplicationTrackerController } from './application-tracker.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      Student,
      Lead,
      Branch,
      ApplicationEducation,
      ApplicationEntranceTest,
      ApplicationWorkExperience,
      ApplicationParent,
      ApplicationAddress,
      ApplicationExtraCurricular,
      ApplicationOtherQualification,
      ApplicationActivity,
      ApplicationStatusLog,
      ApplicationWorkflowSettings,
      ApplicationDocument,
      User,
    ]),
    LeadsModule,
    CoursesModule,
    EmailTemplatesModule,
    NotificationsModule,
  ],
  controllers: [ApplicationTrackerController, ApplicationsController],
  providers: [ApplicationsService, ApplicationStatusService],
  exports: [ApplicationsService, ApplicationStatusService],
})
export class ApplicationsModule {}
