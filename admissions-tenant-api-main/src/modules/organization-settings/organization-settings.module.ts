import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationIntegrationSettings } from './entities/organization-integration-settings.entity.js';
import { OrganizationSettingsService } from './organization-settings.service.js';
import { OrganizationSettingsController } from './organization-settings.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationIntegrationSettings])],
  controllers: [OrganizationSettingsController],
  providers: [OrganizationSettingsService],
  exports: [OrganizationSettingsService],
})
export class OrganizationSettingsModule {}
