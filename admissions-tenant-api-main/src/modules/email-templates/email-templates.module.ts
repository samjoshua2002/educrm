import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity.js';
import { EmailTemplatesService } from './email-templates.service.js';
import { CommunicationDispatchService } from './communication-dispatch.service.js';
import {
  EmailTemplatesController,
  OrgEmailTemplatesController,
  CommunicationDispatchController,
} from './email-templates.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EmailTemplateCategoriesModule } from '../email-template-categories/email-template-categories.module.js';
import { CommunicationsModule } from '../communications/communications.module.js';
import { CommunicationLog } from '../communications/entities/communication-log.entity.js';
import { EmailSuppression } from '../email-campaigns/entities/email-suppression.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailTemplate, EmailSuppression, CommunicationLog]),
    NotificationsModule,
    EmailTemplateCategoriesModule,
    CommunicationsModule,
  ],
  controllers: [EmailTemplatesController, OrgEmailTemplatesController, CommunicationDispatchController],
  providers: [EmailTemplatesService, CommunicationDispatchService],
  exports: [EmailTemplatesService, CommunicationDispatchService],
})
export class EmailTemplatesModule {}
