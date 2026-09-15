import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationIntegrationSettings } from './entities/organization-integration-settings.entity.js';
import { UpdateIntegrationSettingsDto } from './dto/update-integration-settings.dto.js';

@Injectable()
export class OrganizationSettingsService {
  constructor(
    @InjectRepository(OrganizationIntegrationSettings)
    private readonly repo: Repository<OrganizationIntegrationSettings>,
  ) {}

  async findByOrg(organizationId: string): Promise<OrganizationIntegrationSettings | null> {
    return this.repo.findOne({ where: { organizationId } });
  }

  async upsert(
    organizationId: string,
    dto: UpdateIntegrationSettingsDto,
  ): Promise<OrganizationIntegrationSettings> {
    let settings = await this.repo.findOne({ where: { organizationId } });
    if (!settings) {
      settings = this.repo.create({ organizationId });
    }
    Object.assign(settings, dto);
    return this.repo.save(settings);
  }
}
