import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingCampaign } from './entities/marketing-campaign.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { CampaignsService } from './campaigns.service.js';
import { CampaignsController } from './campaigns.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([MarketingCampaign, Lead])],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [TypeOrmModule, CampaignsService],
})
export class CampaignsModule {}
