import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailCampaign } from './entities/email-campaign.entity.js';
import { EmailCampaignRecipient } from './entities/email-campaign-recipient.entity.js';
import { EmailSuppression } from './entities/email-suppression.entity.js';
import { CommunicationLog } from '../communications/entities/communication-log.entity.js';
import { EmailCampaignsService } from './email-campaigns.service.js';
import { EmailCampaignAudienceService } from './email-campaign-audience.service.js';
import { EmailCampaignsController, EmailCampaignTrackingController } from './email-campaigns.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

/** Email campaigns: audience, scheduling (cron), tracking pixel / click redirects, unsubscribe + suppression list. */
@Module({
  imports: [TypeOrmModule.forFeature([EmailCampaign, EmailCampaignRecipient, EmailSuppression, CommunicationLog]), NotificationsModule],
  controllers: [EmailCampaignsController, EmailCampaignTrackingController],
  providers: [EmailCampaignsService, EmailCampaignAudienceService],
  exports: [EmailCampaignsService, EmailCampaignAudienceService],
})
export class EmailCampaignsModule {}
