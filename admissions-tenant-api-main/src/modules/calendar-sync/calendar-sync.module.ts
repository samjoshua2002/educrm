import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarIntegrationSettings } from './entities/calendar-integration-settings.entity.js';
import { InterviewCalendarSync } from './entities/interview-calendar-sync.entity.js';
import { InterviewCalendarEvent } from './entities/interview-calendar-event.entity.js';
import { CalendarSyncService } from './calendar-sync.service.js';
import { CalendarSyncController, CalendarOAuthController } from './calendar-sync.controller.js';
import { Interview } from '../interviews/entities/interview.entity.js';
import { InterviewSlot } from '../interviews/entities/interview-slot.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { User } from '../users/entities/user.entity.js';

// Interview Calendar Sync (Google Calendar / Outlook). Imported by
// InterviewsModule, which calls CalendarSyncService.syncInterview when an
// interview is booked, rescheduled or cancelled.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalendarIntegrationSettings,
      InterviewCalendarSync,
      InterviewCalendarEvent,
      Interview,
      InterviewSlot,
      Application,
      User,
    ]),
  ],
  controllers: [CalendarSyncController, CalendarOAuthController],
  providers: [CalendarSyncService],
  exports: [CalendarSyncService],
})
export class CalendarSyncModule {}
