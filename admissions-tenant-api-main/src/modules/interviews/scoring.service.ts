import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../applications/entities/application.entity.js';
import { ShortlistingRule } from './entities/shortlisting-rule.entity.js';
import { ScoreConversionConfigService } from './score-conversion-config.service.js';

export interface ShortlistPreviewRow {
  applicationId: string;
  applicationNo: string;
  name: string;
  academicComponent: number;
  testComponent: number;
  experienceComponent: number;
  shortlistScore: number;
  shortlistStatus: 'Eligible' | 'Not Eligible';
}

// Converts a raw percentage/percentile/years value into points using an
// admin-configured band list (highest threshold that the value clears wins).
// Bands are org-editable via ScoreConversionConfigService — nothing here is
// a hardcoded cutoff.
function pointsFromBands(
  value: number | null | undefined,
  bands: Array<{ minPercent?: number; minPercentile?: number; minYears?: number; points: number }>,
  key: 'minPercent' | 'minPercentile' | 'minYears',
): number {
  if (value === null || value === undefined || !bands || bands.length === 0) return 0;
  const sorted = [...bands].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
  const match = sorted.find((band) => value >= (band[key] ?? 0));
  return match ? match.points : 0;
}

function parsePercentage(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace('%', '').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

@Injectable()
export class ScoringService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(ShortlistingRule)
    private readonly ruleRepository: Repository<ShortlistingRule>,
    private readonly conversionConfigService: ScoreConversionConfigService,
  ) {}

  // Stage 1 — pre-interview shortlisting score, computed per Application
  // against the org's ShortlistingRule (weightages + cutoff) and the
  // org's ScoreConversionConfig (raw % / percentile -> points bands).
  async previewShortlisting(orgId: string, ruleId: string): Promise<ShortlistPreviewRow[]> {
    const rule = await this.ruleRepository.findOne({ where: { id: ruleId, organizationId: orgId } });
    if (!rule) {
      throw new NotFoundException(`Shortlisting rule #${ruleId} not found`);
    }

    const config = await this.conversionConfigService.getOrCreate(orgId);

    const applications = await this.applicationRepository.find({
      where: { organizationId: orgId, program: rule.program, academicSession: rule.academicYear },
      relations: ['educationRecords', 'entranceTests'],
    });

    return applications.map((app) => this.scoreApplicationForShortlisting(app, rule, config.bands));
  }

  private scoreApplicationForShortlisting(
    app: Application,
    rule: ShortlistingRule,
    bands: Record<string, Array<{ minPercent?: number; minPercentile?: number; minYears?: number; points: number }>>,
  ): ShortlistPreviewRow {
    const tenth = app.educationRecords?.find((e) => e.level === '10th');
    const twelfth = app.educationRecords?.find((e) => e.level === '12th');
    const ug = app.educationRecords?.find((e) => e.level === 'UG');

    const tenthScore = pointsFromBands(parsePercentage(tenth?.percentageCgpa), bands.tenth, 'minPercent');
    const twelfthScore = pointsFromBands(parsePercentage(twelfth?.percentageCgpa), bands.twelfth, 'minPercent');
    const ugScore = pointsFromBands(parsePercentage(ug?.percentageCgpa), bands.ug, 'minPercent');
    const academicComponent = tenthScore + twelfthScore + ugScore;

    const bestTest = app.entranceTests?.sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0))[0];
    const testComponent = pointsFromBands(bestTest?.percentile, bands.testPercentile, 'minPercentile');

    const experienceYears = app.validatedExperienceMonths
      ? Number(app.validatedExperienceMonths) / 12
      : null;
    const experienceComponent = pointsFromBands(experienceYears, bands.experienceYears, 'minYears');

    const shortlistScore =
      academicComponent * (Number(rule.academicWeightage) / 100) +
      testComponent * (Number(rule.testWeightage) / 100) +
      experienceComponent * (Number(rule.experienceWeightage) / 100);

    return {
      applicationId: app.id,
      applicationNo: app.applicationNo,
      name: app.name,
      academicComponent,
      testComponent,
      experienceComponent,
      shortlistScore: Number(shortlistScore.toFixed(2)),
      shortlistStatus: shortlistScore >= Number(rule.cutoffScore) ? 'Eligible' : 'Not Eligible',
    };
  }

  // Commits a previously-previewed run: writes shortlistScore/shortlistStatus
  // onto each Application. Re-runs the same computation rather than trusting
  // client-supplied preview numbers.
  async commitShortlisting(orgId: string, ruleId: string, actorId: string): Promise<{ updated: number }> {
    const preview = await this.previewShortlisting(orgId, ruleId);
    if (preview.length === 0) {
      throw new BadRequestException('No applications matched this rule\'s program/academic year.');
    }

    for (const row of preview) {
      await this.applicationRepository.update(
        { id: row.applicationId, organizationId: orgId },
        {
          shortlistScore: row.shortlistScore,
          shortlistStatus: row.shortlistStatus,
          updatedBy: actorId,
        },
      );
    }

    return { updated: preview.length };
  }
}
