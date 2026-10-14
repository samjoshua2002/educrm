import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallLog } from './entities/call-log.entity.js';
import { TelephonySettings } from './entities/telephony-settings.entity.js';
import { CommunicationLog } from '../communications/entities/communication-log.entity.js';
import { CallsService } from './calls.service.js';
import { CallsController, CallsWebhooksController } from './calls.controller.js';

/** Call management (telephony): call log, click-to-call (Exotel / Twilio Voice), provider webhooks, automations. */
@Module({
  imports: [TypeOrmModule.forFeature([CallLog, TelephonySettings, CommunicationLog])],
  controllers: [CallsController, CallsWebhooksController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
