import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reminder } from './entities/reminder.entity.js';
import { ReminderRule } from './entities/reminder-rule.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { ApplicationDocument } from '../documents/entities/application-document.entity.js';
import { EmailTemplate } from '../email-templates/entities/email-template.entity.js';
import { ApplicationsModule } from '../applications/applications.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { RemindersService } from './reminders.service.js';
import { RemindersController, RemindersPublicController } from './reminders.controller.js';

/**
 * Reminders & Nudges — rule-based automation engine (cron every 30 min) with
 * Email (MailerService), SMS / WhatsApp (MessagingService, @Global) and
 * In-app (InAppNotificationsService, @Global) channels.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Reminder, ReminderRule, Application, ApplicationDocument, EmailTemplate]),
    ApplicationsModule,
    NotificationsModule,
  ],
  controllers: [RemindersController, RemindersPublicController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
