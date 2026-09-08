import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity.js';
import { EmailTemplatesService } from './email-templates.service.js';
import {
  EmailTemplatesController,
  OrgEmailTemplatesController,
} from './email-templates.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate]), NotificationsModule],
  controllers: [EmailTemplatesController, OrgEmailTemplatesController],
  providers: [EmailTemplatesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
