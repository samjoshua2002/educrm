import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadManagementSettings } from './entities/lead-management-settings.entity.js';

@Injectable()
export class LeadSettingsService {
  constructor(
    @InjectRepository(LeadManagementSettings)
    private readonly repo: Repository<LeadManagementSettings>,
  ) {}

  async get(orgId: string): Promise<LeadManagementSettings> {
    let settings = await this.repo.findOne({ where: { organizationId: orgId } });
    if (!settings) {
      settings = this.repo.create({
        organizationId: orgId,
        hotThreshold: 20,
        warmThreshold: 10,
        defaultDistribution: 'round_robin',
        defaultAssigneeRole: 'lead_manager',
        reentryBlockThreshold: 95,
        duplicateFlagThreshold: 70,
      });
      try {
        settings = await this.repo.save(settings);
      } catch {
        // concurrent create (unique org) — read the winner
        settings = (await this.repo.findOne({ where: { organizationId: orgId } }))!;
      }
    }
    return settings;
  }

  async update(orgId: string, dto: Partial<LeadManagementSettings>): Promise<LeadManagementSettings> {
    const settings = await this.get(orgId);
    const allowed: (keyof LeadManagementSettings)[] = [
      'hotThreshold',
      'warmThreshold',
      'defaultDistribution',
      'defaultAssigneeRole',
      'reentryBlockThreshold',
      'duplicateFlagThreshold',
    ];
    for (const key of allowed) {
      if (dto[key] !== undefined && dto[key] !== null) (settings as any)[key] = dto[key];
    }
    if (Number(settings.hotThreshold) <= Number(settings.warmThreshold)) {
      throw new BadRequestException('Hot threshold must be greater than the warm threshold');
    }
    if (settings.duplicateFlagThreshold > settings.reentryBlockThreshold) {
      throw new BadRequestException('Duplicate flag threshold cannot exceed the re-entry block threshold');
    }
    return this.repo.save(settings);
  }
}
