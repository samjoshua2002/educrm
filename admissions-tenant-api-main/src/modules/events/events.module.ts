import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementEvent } from './entities/event.entity.js';
import { EventsService } from './events.service.js';
import { OrgEventsController } from './events.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([AnnouncementEvent])],
  controllers: [OrgEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
