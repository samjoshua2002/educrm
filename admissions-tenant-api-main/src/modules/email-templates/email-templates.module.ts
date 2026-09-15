import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity.js';
import { EmailTemplatesService } from './email-templates.service.js';
import {
  EmailTemplatesController,
  OrgEmailTemplatesController,
} from './email-templates.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EmailTemplateCategoriesModule } from '../email-template-categories/email-template-categories.module.js';
import { CommunicationsModule } from '../communications/communications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailTemplate]),
    NotificationsModule,
    EmailTemplateCategoriesModule,
    CommunicationsModule,
  ],
  controllers: [EmailTemplatesController, OrgEmailTemplatesController],
  providers: [EmailTemplatesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
