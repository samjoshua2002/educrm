import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service.js';
import { CommunicationsModule } from '../communications/communications.module.js';

@Module({
  imports: [CommunicationsModule],
  providers: [MailerService],
  exports: [MailerService],
})
export class NotificationsModule {}
