import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementEvent } from './entities/event.entity.js';
import { CommunicationLog } from '../communications/entities/communication-log.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EventsService } from './events.service.js';
import { EventDeliveryService } from './event-delivery.service.js';
import { OrgEventsController } from './events.controller.js';

/**
 * Announcements & events. Delivery targets leads, applicants, students and
 * staff through in-app notifications (global InAppNotificationsService),
 * email (MailerService) and WhatsApp (global MessagingService), and records
 * each email / WhatsApp in communication_logs.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEvent, CommunicationLog]), NotificationsModule],
  controllers: [OrgEventsController],
  providers: [EventsService, EventDeliveryService],
  exports: [EventsService],
})
export class EventsModule {}
