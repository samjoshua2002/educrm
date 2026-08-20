import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoreConversionConfig } from './entities/score-conversion-config.entity.js';
import { UpdateScoreConversionConfigDto } from './dto/update-score-conversion-config.dto.js';

const DEFAULT_BANDS = {
  tenth: [],
  twelfth: [],
  ug: [],
  testPercentile: [],
  experienceYears: [],
};

@Injectable()
export class ScoreConversionConfigService {
  constructor(
    @InjectRepository(ScoreConversionConfig)
    private readonly configRepository: Repository<ScoreConversionConfig>,
  ) {}

  // Every org gets an editable-but-empty config on first read, so the
  // shortlisting/rollup engines always have a row to query against instead
  // of branching on "config missing".
  async getOrCreate(orgId: string) {
    let config = await this.configRepository.findOne({ where: { organizationId: orgId } });
    if (!config) {
      config = this.configRepository.create({
        organizationId: orgId,
        bands: DEFAULT_BANDS,
        discrepancyThreshold: 10,
      });
      config = await this.configRepository.save(config);
    }
    return config;
  }

  async update(orgId: string, dto: UpdateScoreConversionConfigDto, actorId: string) {
    const config = await this.getOrCreate(orgId);
    Object.assign(config, dto);
    config.updatedBy = actorId;
    return this.configRepository.save(config);
  }
}
