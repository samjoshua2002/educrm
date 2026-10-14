import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingService } from './messaging.service.js';
import { RecipientResolverService } from './recipient-resolver.service.js';
import { MessagingController, MessagingWebhooksController } from './messaging.controller.js';
import { MessageLog } from './entities/message-log.entity.js';
import { MessagingSettings } from './entities/messaging-settings.entity.js';
import { MessagingConsent } from './entities/messaging-consent.entity.js';
import { CommunicationLog } from '../communications/entities/communication-log.entity.js';

/** Global so any module can inject MessagingService without importing this module. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MessageLog, MessagingSettings, MessagingConsent, CommunicationLog])],
  controllers: [MessagingController, MessagingWebhooksController],
  providers: [MessagingService, RecipientResolverService],
  exports: [MessagingService, RecipientResolverService],
})
export class MessagingModule {}
