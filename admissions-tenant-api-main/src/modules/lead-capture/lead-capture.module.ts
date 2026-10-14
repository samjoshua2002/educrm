import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadCaptureSettings } from './entities/lead-capture-settings.entity.js';
import { LeadCaptureEvent } from './entities/lead-capture-event.entity.js';
import { LeadImportBatch } from './entities/lead-import-batch.entity.js';
import { ChatbotConversation } from './entities/chatbot-conversation.entity.js';
import { MarketingCampaign } from '../campaigns/entities/marketing-campaign.entity.js';
import { LeadsModule } from '../leads/leads.module.js';
import { LeadCaptureService } from './lead-capture.service.js';
import { LeadCaptureController, PublicLeadCaptureController } from './lead-capture.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeadCaptureSettings,
      LeadCaptureEvent,
      LeadImportBatch,
      ChatbotConversation,
      MarketingCampaign,
    ]),
    LeadsModule,
  ],
  controllers: [LeadCaptureController, PublicLeadCaptureController],
  providers: [LeadCaptureService],
  exports: [LeadCaptureService],
})
export class LeadCaptureModule {}
