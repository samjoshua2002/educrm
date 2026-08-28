import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Application } from '../applications/entities/application.entity.js';
import { ShortlistingRule } from './entities/shortlisting-rule.entity.js';
import { ScoreConversionConfigService } from './score-conversion-config.service.js';
import { Interview } from './entities/interview.entity.js';
import { InterviewEvaluation } from './entities/interview-evaluation.entity.js';
import { EvaluationScore } from './entities/evaluation-score.entity.js';
import { EvaluationRubric } from './entities/evaluation-rubric.entity.js';
import { ScoreAdjustmentDto } from './dto/score-adjustment.dto.js';

export interface InterviewScoreBreakdown {
  interviewId: string;
  interviewType: string;
  round: number;
  status: string;
  // null when the interview isn't Completed yet, or is Completed but has no
  // submitted (non-draft) evaluations yet — it simply doesn't factor into
  // gdpiTotal in that case.
  score: number | null;
  evaluatorCount: number;
}

export interface CompositeScoreBreakdown {
  applicationId: string;
  applicationNo: string;
  interviews: InterviewScoreBreakdown[];
  // Average score (out of ~100, per the rubric weightage scale) across all
  // Completed GD interview round(s) that have submitted evaluations, and
  // likewise for PI. null if there are no such rounds yet.
  gdScore: number | null;
  piScore: number | null;
  gdpiTotal: number;
  // Academic component scores (band-derived)
  tenthScore: number;
  twelfthScore: number;
  ugScore: number;
  academicComponent: number;
  maxAcademicScore: number;
  // Entrance test score (band-derived, from best percentile)
  testComponent: number;
  maxTestScore: number;
  // Experience score (auto-calculated from from/to dates, band-derived)
  experienceComponent: number;
  maxExperienceScore: number;
  claimedExperienceMonths: string | null;
  validatedExperienceMonths: string | null;
  // Auto-calculated from work experience from/to dates (used when validatedExperienceMonths not set)
  autoCalculatedMonths: number | null;
  discrepancyFlag: boolean;
  achievementScore: number;
  penaltyScore: number;
  otherComponentsTotal: number;
  compositeScore: number;
}

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
  const numValue = value !== null && value !== undefined ? Number(value) : null;
  if (numValue === null || !Number.isFinite(numValue) || !bands || bands.length === 0) return 0;

  const normalised = bands
    .map((b: any) => {
      const thresholdVal = b[key] ?? b.minYears ?? b.min_years ?? b.minPercent ?? b.min_percent ?? b.minPercentile ?? b.min_percentile ?? 0;
      const pointsVal = b.points ?? b.score ?? 0;
      return {
        threshold: Number(thresholdVal) || 0,
        points: Number(pointsVal) || 0,
      };
    })
    .sort((a, b) => b.threshold - a.threshold);

  for (const band of normalised) {
    if (numValue >= band.threshold) {
      return band.points;
    }
  }
  return 0;
}

function parsePercentage(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace('%', '').trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

// Sums total claimed work-experience duration (in months) across all of an
// application's work-experience records, from each record's from/to dates.
// A missing toDate is treated as "ongoing" (counted up to today). Returns
// null when there are no usable records, so pointsFromBands scores it 0
// rather than conflating "no experience" with "no data".
function sumExperienceMonths(
  records: Array<{ fromDate?: Date | string | null; toDate?: Date | string | null }> | undefined,
): number | null {
  if (!records || records.length === 0) return null;
  let totalMonths = 0;
  let counted = false;
  for (const rec of records) {
    if (!rec.fromDate) continue;
    const from = new Date(rec.fromDate);
    const to = rec.toDate ? new Date(rec.toDate) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) continue;
    const months = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    totalMonths += months;
    counted = true;
  }
  return counted ? totalMonths : null;
}

@Injectable()
export class ScoringService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(ShortlistingRule)
    private readonly ruleRepository: Repository<ShortlistingRule>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(InterviewEvaluation)
    private readonly evaluationRepository: Repository<InterviewEvaluation>,
    @InjectRepository(EvaluationScore)
    private readonly evaluationScoreRepository: Repository<EvaluationScore>,
    private readonly conversionConfigService: ScoreConversionConfigService,
  ) {}

  // Stage 1 — pre-interview shortlisting score, computed per Application
  // against the org's ShortlistingRule (weightages + cutoff) and the
  // org's ScoreConversionConfig (raw % / percentile -> points bands).
  // academic + test + experience all feed shortlistScore/shortlistStatus.
  // Experience here is the applicant's *claimed* (self-reported) work
  // history, derived from application_work_experience records — validated
  // experience is only known later, post-interview, and is what feeds the
  // separate post-interview composite score instead (see
  // buildCompositeScoreBreakdown below).
  async previewShortlisting(orgId: string, ruleId: string): Promise<ShortlistPreviewRow[]> {
    const rule = await this.ruleRepository.findOne({ where: { id: ruleId, organizationId: orgId } });
    if (!rule) {
      throw new NotFoundException(`Shortlisting rule #${ruleId} not found`);
    }

    const config = await this.conversionConfigService.getOrCreate(orgId);

    const applications = await this.applicationRepository.find({
      where: {
        organizationId: orgId,
        program: rule.program,
        academicSession: rule.academicYear,
        verificationStatus: 'verified',
      },
      relations: ['educationRecords', 'entranceTests', 'workExperienceRecords'],
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

    // Claimed (self-reported) experience, summed from the applicant's
    // work-experience records — this is all that's known pre-interview.
    const claimedMonths = sumExperienceMonths(app.workExperienceRecords);
    const experienceYears = claimedMonths !== null ? claimedMonths / 12 : null;
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

  // ==========================================================================
  // Stage 2 — post-interview composite score rollup.
  //
  // Formula (documented here, the single source of truth):
  //   gdpiTotal          = avg(score of each Completed GD interview round
  //                            that has >=1 submitted evaluation)
  //                       + avg(score of each Completed PI interview round
  //                            that has >=1 submitted evaluation)
  //                        (0 for a side with no scored rounds yet; rounds of
  //                        the SAME type are averaged, not summed, so extra
  //                        re-interview rounds don't inflate the total)
  //   experienceComponent = pointsFromBands(validatedExperienceMonths/12,
  //                            config.bands.experienceYears) — same band
  //                            lookup Stage-1 shortlisting uses, now finally
  //                            populated because validatedExperienceMonths is
  //                            set post-interview (see
  //                            ApplicationsService.updateGdEvaluation).
  //   otherComponentsTotal = achievementScore - penaltyScore (both admin-set
  //                            manual adjustments via applyScoreAdjustment,
  //                            default 0 — there is no automated source for
  //                            either, see ScoreAdjustmentDto).
  //   compositeScore       = gdpiTotal + experienceComponent
  //                            + otherComponentsTotal
  //
  // discrepancyFlag: claimedExperienceMonths vs validatedExperienceMonths,
  // flagged when the absolute percentage difference (relative to claimed)
  // exceeds ScoreConversionConfig.discrepancyThreshold.
  //
  // Safe to call repeatedly (idempotent) — always recomputed from source
  // rows (Interview/InterviewEvaluation/EvaluationScore + Application's own
  // achievement/penalty/experience fields), never accumulated.
  // ==========================================================================

  async computeCompositeScore(orgId: string, applicationId: string): Promise<CompositeScoreBreakdown> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId, organizationId: orgId },
    });
    if (!application) {
      throw new NotFoundException(`Application #${applicationId} not found`);
    }

    const breakdown = await this.buildCompositeScoreBreakdown(orgId, application);

    application.experienceScore = breakdown.experienceComponent;
    application.gdpiTotal = breakdown.gdpiTotal;
    application.otherComponentsTotal = breakdown.otherComponentsTotal;
    application.compositeScore = breakdown.compositeScore;
    application.discrepancyFlag = breakdown.discrepancyFlag;
    await this.applicationRepository.save(application);

    return breakdown;
  }

  // Read-only variant used by the GET .../composite-score endpoint — looks
  // the application up by applicationNo and still persists the freshly
  // recomputed values (compute-and-return, not just read stale columns).
  async getCompositeScoreBreakdown(orgId: string, applicationNo: string): Promise<CompositeScoreBreakdown> {
    const application = await this.applicationRepository.findOne({ where: { applicationNo, organizationId: orgId } });
    if (!application) {
      throw new NotFoundException(`Application ${applicationNo} not found`);
    }
    return this.computeCompositeScore(orgId, application.id);
  }

  // Admin-only manual achievement/penalty adjustment (there is no automated
  // source for either — see class-level formula comment). Re-runs the
  // rollup immediately so compositeScore reflects the adjustment.
  async applyScoreAdjustment(
    orgId: string,
    applicationNo: string,
    dto: ScoreAdjustmentDto,
    actorId: string,
  ): Promise<CompositeScoreBreakdown> {
    const application = await this.applicationRepository.findOne({ where: { applicationNo, organizationId: orgId } });
    if (!application) {
      throw new NotFoundException(`Application ${applicationNo} not found`);
    }

    if (dto.achievementScore !== undefined) application.achievementScore = dto.achievementScore;
    if (dto.penaltyScore !== undefined) application.penaltyScore = dto.penaltyScore;
    if (dto.remarks !== undefined) application.scoreAdjustmentRemarks = dto.remarks;
    application.updatedBy = actorId;
    await this.applicationRepository.save(application);

    return this.computeCompositeScore(orgId, application.id);
  }

  private async buildCompositeScoreBreakdown(orgId: string, application: Application): Promise<CompositeScoreBreakdown> {
    // Reload with relations needed for band-based academic/test/experience scoring
    const fullApplication = await this.applicationRepository.findOne({
      where: { id: application.id, organizationId: orgId },
      relations: ['educationRecords', 'entranceTests', 'workExperienceRecords'],
    }) ?? application;

    const interviews = await this.interviewRepository.find({
      where: { applicationId: application.id, organizationId: orgId },
      order: { round: 'ASC' },
    });

    const interviewBreakdowns: InterviewScoreBreakdown[] = [];
    for (const interview of interviews) {
      if (interview.status !== 'Completed') {
        interviewBreakdowns.push({
          interviewId: interview.id,
          interviewType: interview.interviewType,
          round: interview.round,
          status: interview.status,
          score: null,
          evaluatorCount: 0,
        });
        continue;
      }

      // Only locked-in ("submitted") evaluations count — drafts don't factor
      // into the rollup.
      const submittedEvaluations = await this.evaluationRepository.find({
        where: { interviewId: interview.id, status: 'submitted' },
      });

      if (submittedEvaluations.length === 0) {
        interviewBreakdowns.push({
          interviewId: interview.id,
          interviewType: interview.interviewType,
          round: interview.round,
          status: interview.status,
          score: null,
          evaluatorCount: 0,
        });
        continue;
      }

      const evaluationIds = submittedEvaluations.map((e) => e.id);
      const scores = await this.evaluationScoreRepository.find({
        where: { evaluationId: In(evaluationIds) },
        relations: ['rubric'],
      });

      // Average each evaluator's raw scoreGiven per rubric item across all
      // evaluators who submitted, THEN apply that rubric's weightagePercent
      // — simpler than weighting each evaluator's contribution individually
      // and standard for panel scoring. Sum across rubric items for the
      // interview's total (out of ~100, or whatever the org's weightages
      // sum to — not enforced here).
      const byRubric = new Map<string, { sum: number; count: number; rubric: EvaluationRubric }>();
      for (const score of scores) {
        if (!score.rubric) continue;
        const entry = byRubric.get(score.rubricId) ?? { sum: 0, count: 0, rubric: score.rubric };
        entry.sum += Number(score.scoreGiven);
        entry.count += 1;
        byRubric.set(score.rubricId, entry);
      }

      let interviewScore = 0;
      for (const { sum, count, rubric } of byRubric.values()) {
        const maxScore = Number(rubric.maxScore) || 0;
        const weightagePercent = Number(rubric.weightagePercent) || 0;
        if (!maxScore) continue;
        const avgRaw = sum / count;
        interviewScore += (avgRaw / maxScore) * weightagePercent;
      }

      interviewBreakdowns.push({
        interviewId: interview.id,
        interviewType: interview.interviewType,
        round: interview.round,
        status: interview.status,
        score: Number(interviewScore.toFixed(2)),
        evaluatorCount: submittedEvaluations.length,
      });
    }

    // Multiple rounds of the SAME interviewType (e.g. a re-interview PI
    // round) are averaged, not summed — a re-round is a re-assessment of
    // the same axis, not an extra one.
    const gdScores = interviewBreakdowns
      .filter((i) => i.interviewType === 'GD' && i.score !== null)
      .map((i) => i.score as number);
    const piScores = interviewBreakdowns
      .filter((i) => i.interviewType === 'PI' && i.score !== null)
      .map((i) => i.score as number);
    const gdScore = gdScores.length ? gdScores.reduce((a, b) => a + b, 0) / gdScores.length : null;
    const piScore = piScores.length ? piScores.reduce((a, b) => a + b, 0) / piScores.length : null;
    const gdpiTotal = Number(((gdScore ?? 0) + (piScore ?? 0)).toFixed(2));

    const config = await this.conversionConfigService.getOrCreate(orgId);

    // Academic component scores from band config
    const tenth = fullApplication.educationRecords?.find((e) => e.level === '10th');
    const twelfth = fullApplication.educationRecords?.find((e) => e.level === '12th');
    const ug = fullApplication.educationRecords?.find((e) => e.level === 'UG');
    const tenthScore = pointsFromBands(parsePercentage(tenth?.percentageCgpa), config.bands.tenth ?? [], 'minPercent');
    const twelfthScore = pointsFromBands(parsePercentage(twelfth?.percentageCgpa), config.bands.twelfth ?? [], 'minPercent');
    const ugScore = pointsFromBands(parsePercentage(ug?.percentageCgpa), config.bands.ug ?? [], 'minPercent');
    const academicComponent = tenthScore + twelfthScore + ugScore;

    // Entrance test score from band config (best percentile wins)
    const bestTest = fullApplication.entranceTests?.sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0))[0];
    const testComponent = pointsFromBands(bestTest?.percentile, config.bands.testPercentile ?? [], 'minPercentile');
    const maxTestScore = Math.max(0, ...(config.bands.testPercentile ?? []).map((b) => Number(b.points ?? 0)));

    // Max possible scores per category (for UI display)
    const maxAcadPerCategory = (bandKey: 'tenth' | 'twelfth' | 'ug') =>
      Math.max(0, ...(config.bands[bandKey] ?? []).map((b) => Number(b.points ?? 0)));
    const maxAcademicScore = maxAcadPerCategory('tenth') + maxAcadPerCategory('twelfth') + maxAcadPerCategory('ug');

    // Experience score: automatically calculated from candidate's work experience from/to dates.
    const autoCalcMonths = sumExperienceMonths(fullApplication.workExperienceRecords ?? []);
    const validatedMonths = application.validatedExperienceMonths ? Number(application.validatedExperienceMonths) : null;
    const claimedMonths = application.claimedExperienceMonths ? Number(application.claimedExperienceMonths) : null;
    
    // Always prefer auto-calculated months from job records if present; fall back to validatedMonths
    const effectiveMonths = (autoCalcMonths !== null && autoCalcMonths > 0)
      ? autoCalcMonths
      : (validatedMonths !== null && Number.isFinite(validatedMonths) && validatedMonths > 0 ? validatedMonths : null);

    const experienceYears = effectiveMonths !== null && effectiveMonths > 0 ? effectiveMonths / 12 : null;
    const experienceComponent = pointsFromBands(experienceYears, config.bands.experienceYears ?? [], 'minYears');
    const maxExperienceScore = Math.max(0, ...(config.bands.experienceYears ?? []).map((b: any) => Number(b.points ?? b.score ?? 0)));
    // DEBUG — remove after confirming scores are correct
    console.log('[scoring] exp debug', {
      validatedMonths,
      autoCalcMonths,
      effectiveMonths,
      experienceYears,
      experienceComponent,
      maxExperienceScore,
      bandCount: (config.bands.experienceYears ?? []).length,
      bands: config.bands.experienceYears,
    });

    // discrepancyThreshold is treated as a PERCENTAGE difference threshold
    // relative to the claimed value. No discrepancy check is possible (and
    // none is raised) if claimedMonths is missing/zero or validatedMonths
    // hasn't been recorded yet.
    let discrepancyFlag = false;
    if (
      claimedMonths !== null &&
      Number.isFinite(claimedMonths) &&
      claimedMonths !== 0 &&
      validatedMonths !== null &&
      Number.isFinite(validatedMonths)
    ) {
      const percentDiff = (Math.abs(claimedMonths - validatedMonths) / claimedMonths) * 100;
      discrepancyFlag = percentDiff > Number(config.discrepancyThreshold);
    }

    const achievementScore = Number(application.achievementScore) || 0;
    const penaltyScore = Number(application.penaltyScore) || 0;
    const otherComponentsTotal = Number((achievementScore - penaltyScore).toFixed(2));
    const compositeScore = Number((gdpiTotal + experienceComponent + otherComponentsTotal).toFixed(2));

    return {
      applicationId: application.id,
      applicationNo: application.applicationNo,
      interviews: interviewBreakdowns,
      gdScore: gdScore !== null ? Number(gdScore.toFixed(2)) : null,
      piScore: piScore !== null ? Number(piScore.toFixed(2)) : null,
      gdpiTotal,
      tenthScore,
      twelfthScore,
      ugScore,
      academicComponent,
      maxAcademicScore,
      testComponent,
      maxTestScore,
      experienceComponent,
      maxExperienceScore,
      claimedExperienceMonths: application.claimedExperienceMonths ?? null,
      validatedExperienceMonths: application.validatedExperienceMonths ?? null,
      autoCalculatedMonths: autoCalcMonths !== null ? Math.round(autoCalcMonths) : null,
      discrepancyFlag,
      achievementScore,
      penaltyScore,
      otherComponentsTotal,
      compositeScore,
    };
  }
}
