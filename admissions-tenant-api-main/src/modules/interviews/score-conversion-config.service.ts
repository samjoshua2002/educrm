import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScoreConversionConfig } from './entities/score-conversion-config.entity.js';
import { UpdateScoreConversionConfigDto } from './dto/update-score-conversion-config.dto.js';

// Sensible out-of-the-box bands (points out of 10) so shortlisting produces
// real, non-zero numbers before an admin has touched this config. Fully
// editable per-org via PATCH /organizations/:orgId/score-conversion-config —
// this is only the seed used when a config row doesn't exist yet.
const ACADEMIC_BANDS = [
  { minPercent: 90, points: 10 },
  { minPercent: 80, points: 8 },
  { minPercent: 70, points: 6 },
  { minPercent: 60, points: 4 },
  { minPercent: 50, points: 2 },
];

const DEFAULT_BANDS = {
  tenth: ACADEMIC_BANDS,
  twelfth: ACADEMIC_BANDS,
  ug: ACADEMIC_BANDS,
  testPercentile: [
    { minPercentile: 95, points: 10 },
    { minPercentile: 90, points: 8 },
    { minPercentile: 80, points: 6 },
    { minPercentile: 70, points: 4 },
    { minPercentile: 60, points: 2 },
  ],
  // Experience is stored/edited in months everywhere else in the app
  // (application_work_experience.from_date/to_date, claimedExperienceMonths,
  // validatedExperienceMonths), so bands key off minMonths too — no year<->
  // month conversion needed anywhere else in the scoring code.
  experienceMonths: [
    { minMonths: 60, points: 10 }, // 5 years
    { minMonths: 36, points: 7 },  // 3 years
    { minMonths: 12, points: 4 },  // 1 year
    { minMonths: 0, points: 0 },
  ],
};

@Injectable()
export class ScoreConversionConfigService {
  constructor(
    @InjectRepository(ScoreConversionConfig)
    private readonly configRepository: Repository<ScoreConversionConfig>,
  ) {}

  // Every org gets an editable config seeded with sensible default bands on
  // first read, so the shortlisting/rollup engines always have real,
  // non-zero conversion tables to query against instead of branching on
  // "config missing" (or scoring everything to 0 because bands are empty).
  async getOrCreate(orgId: string) {
    let config = await this.configRepository.findOne({ where: { organizationId: orgId } });
    if (!config) {
      config = this.configRepository.create({
        organizationId: orgId,
        // Deep-clone so per-org rows never share array/object references
        // back to the module-level default.
        bands: JSON.parse(JSON.stringify(DEFAULT_BANDS)),
        discrepancyThreshold: 10,
      });
      config = await this.configRepository.save(config);
    } else if (!config.bands?.experienceMonths && (config.bands as any)?.experienceYears) {
      // One-time migration for rows saved before the years->months switch:
      // convert the old minYears bands to minMonths in place so existing
      // orgs don't silently lose their configured experience bands.
      const oldBands = (config.bands as any).experienceYears as Array<{ minYears?: number; points: number }>;
      config.bands = {
        ...config.bands,
        experienceMonths: oldBands.map((b) => ({ minMonths: (b.minYears ?? 0) * 12, points: b.points })),
      };
      delete (config.bands as any).experienceYears;
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
