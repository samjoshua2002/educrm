import { Injectable, NotFoundException, BadRequestException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Application } from '../applications/entities/application.entity.js';
import { ShortlistingRule } from './entities/shortlisting-rule.entity.js';
import { ScoreConversionConfigService } from './score-conversion-config.service.js';
import { Interview } from './entities/interview.entity.js';
import { InterviewEvaluation } from './entities/interview-evaluation.entity.js';
import { EvaluationScore } from './entities/evaluation-score.entity.js';
import { EvaluationRubric } from './entities/evaluation-rubric.entity.js';
import { ScoreAdjustmentDto } from './dto/score-adjustment.dto.js';
import { EmailTemplatesService } from '../email-templates/email-templates.service.js';
import { MailerService } from '../notifications/mailer.service.js';
import { CommunicationsService } from '../communications/communications.service.js';

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
  qualifyingScore: number;
  isQualified: boolean;
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
  bands: Array<{ minPercent?: number; minPercentile?: number; minYears?: number; minMonths?: number; points: number }>,
  key: 'minPercent' | 'minPercentile' | 'minYears' | 'minMonths',
): number {
  const numValue = value !== null && value !== undefined ? Number(value) : null;
  if (numValue === null || !Number.isFinite(numValue) || !bands || bands.length === 0) return 0;

  const valToCompare = key === 'minMonths' ? Math.round(numValue) : numValue;

  const normalised = bands
    .map((b: any) => {
      let thresholdVal = 0;
      if (key === 'minMonths') {
        if (b.minMonths !== undefined && b.minMonths !== null) {
          thresholdVal = Number(b.minMonths) || 0;
        } else if (b.min_months !== undefined && b.min_months !== null) {
          thresholdVal = Number(b.min_months) || 0;
        } else if (b.minYears !== undefined && b.minYears !== null) {
          thresholdVal = (Number(b.minYears) || 0) * 12;
        } else if (b.min_years !== undefined && b.min_years !== null) {
          thresholdVal = (Number(b.min_years) || 0) * 12;
        }
      } else {
        const raw = b[key] ?? b.minYears ?? b.min_years ?? b.minPercent ?? b.min_percent ?? b.minPercentile ?? b.min_percentile ?? 0;
        thresholdVal = Number(raw) || 0;
      }
      const pointsVal = b.points ?? b.score ?? 0;
      return {
        threshold: thresholdVal,
        points: Number(pointsVal) || 0,
      };
    })
    .sort((a, b) => b.threshold - a.threshold);

  for (const band of normalised) {
    if (valToCompare >= band.threshold) {
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
  records: Array<{ fromDate?: Date | string | null; from_date?: Date | string | null; toDate?: Date | string | null; to_date?: Date | string | null }> | undefined,
): number | null {
  if (!records || records.length === 0) return null;
  let totalMonths = 0;
  let counted = false;
  for (const rec of records) {
    const rawFrom = rec.fromDate ?? rec.from_date;
    const rawTo = rec.toDate ?? rec.to_date;
    if (!rawFrom) continue;
    const from = new Date(rawFrom);
    const to = rawTo ? new Date(rawTo) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) continue;
    const months = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    totalMonths += months;
    counted = true;
  }
  return counted ? Math.round(totalMonths) : null;
}

// Picks the single highest entrance-test percentile across all of an
// application's entrance-test records. When an applicant has sat multiple
// tests we score only their best attempt — percentiles are never summed or
// averaged. Decimal columns come back from the driver as strings, so each
// value is coerced before comparison. Returns null when there is no usable
// percentile, so pointsFromBands scores it 0.
function bestEntrancePercentile(
  records: Array<{ percentile?: number | string | null }> | undefined,
): number | null {
  if (!records || records.length === 0) return null;
  let best: number | null = null;
  for (const rec of records) {
    if (rec.percentile === null || rec.percentile === undefined) continue;
    const val = Number(rec.percentile);
    if (!Number.isFinite(val)) continue;
    if (best === null || val > best) best = val;
  }
  return best;
}

@Injectable()
export class ScoringService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScoringService.name);

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
    private readonly emailTemplatesService: EmailTemplatesService,
    private readonly mailerService: MailerService,
    private readonly communicationsService: CommunicationsService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap() {
    // Check immediately on startup, then every 30 seconds
    void this.checkAndTriggerAutoAnnounce();
    setInterval(() => {
      void this.checkAndTriggerAutoAnnounce();
    }, 30000);
  }

  private async checkAndTriggerAutoAnnounce() {
    try {
      const now = new Date();
      const configs = await this.conversionConfigService.findPendingAutoAnnouncements(now);
      for (const cfg of configs) {
        try {
          this.logger.log(`Auto-announcing results for org ${cfg.organizationId} at scheduled declaration date ${cfg.resultsDeclarationDate}`);
          await this.announceResults(
            cfg.organizationId,
            cfg.resultsDeclarationDate ? new Date(cfg.resultsDeclarationDate).toISOString() : undefined,
            undefined,
          );
        } catch (err: any) {
          this.logger.error(`Error during auto-announce for org ${cfg.organizationId}: ${err?.message || err}`);
        }
      }
    } catch {
      // background sweep error caught
    }
  }

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

    // Applications already committed as "Shortlisted" or "Review" in a previous run are
    // dropped from subsequent previews — a re-run only scores candidates
    // still awaiting a shortlisting decision.
    return applications
      .filter((app) => app.shortlistStatus !== 'Shortlisted' && app.shortlistStatus !== 'Review')
      .map((app) => this.scoreApplicationForShortlisting(app, rule, config.bands));
  }

  private scoreApplicationForShortlisting(
    app: Application,
    rule: ShortlistingRule,
    bands: Record<string, Array<{ minPercent?: number; minPercentile?: number; minYears?: number; minMonths?: number; points: number }>>,
  ): ShortlistPreviewRow {
    const tenth = app.educationRecords?.find((e) => e.level === '10th');
    const twelfth = app.educationRecords?.find((e) => e.level === '12th');
    const ug = app.educationRecords?.find((e) => e.level === 'UG');

    const tenthScore = pointsFromBands(parsePercentage(tenth?.percentageCgpa), bands.tenth, 'minPercent');
    const twelfthScore = pointsFromBands(parsePercentage(twelfth?.percentageCgpa), bands.twelfth, 'minPercent');
    const ugScore = pointsFromBands(parsePercentage(ug?.percentageCgpa), bands.ug, 'minPercent');
    const academicComponent = tenthScore + twelfthScore + ugScore;

    // If an application has multiple entrance tests, only the single highest
    // percentile counts towards the shortlisting score (never summed).
    const bestTestPercentile = bestEntrancePercentile(app.entranceTests);
    const testComponent = pointsFromBands(bestTestPercentile, bands.testPercentile, 'minPercentile');

    // Claimed (self-reported) experience, summed (in months) from the
    // applicant's work-experience records — this is all that's known
    // pre-interview. Bands are keyed in months, matching how experience is
    // stored/displayed everywhere else in the app.
    const claimedMonths = sumExperienceMonths(app.workExperienceRecords);
    const experienceComponent = pointsFromBands(claimedMonths, bands.experienceMonths, 'minMonths');

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

    const notifyCandidateIds: string[] = [];
    for (const row of preview) {
      const isShortlisted = row.shortlistStatus === 'Eligible';
      const committedStatus = isShortlisted ? 'Shortlisted' : 'Review';
      await this.applicationRepository.update(
        { id: row.applicationId, organizationId: orgId },
        {
          shortlistScore: row.shortlistScore,
          // Eligible candidates become "Shortlisted", non-eligible become "Review".
          // Both move to the interview stage and drop out of future shortlisting runs.
          shortlistStatus: committedStatus,
          updatedBy: actorId,
        },
      );
      // Both Shortlisted and Review candidates receive the interview invitation email
      // so candidates attend the interview without knowing their preliminary status.
      notifyCandidateIds.push(row.applicationId);
    }

    // Notify each candidate (Shortlisted & Review). Fire-and-forget-ish: the mailer
    // swallows its own errors, and we don't let a slow SMTP server hold up the commit response.
    if (notifyCandidateIds.length > 0) {
      void this.sendShortlistedEmails(orgId, notifyCandidateIds);
    }

    return { updated: preview.length };
  }

  private async sendShortlistedEmails(orgId: string, applicationIds: string[]): Promise<void> {
    const applications = await this.applicationRepository.find({
      where: { id: In(applicationIds), organizationId: orgId },
    });
    for (const application of applications) {
      if (!application.email) continue;
      await this.emailTemplatesService.sendTransactional({
        organizationId: orgId,
        categorySlug: 'shortlisted',
        to: application.email,
        applicationNo: application.applicationNo,
        applicantName: application.name,
        variables: {
          name: application.name,
          email: application.email,
          phone: application.primaryMobile,
          application_no: application.applicationNo,
          academic_session: application.academicSession,
          course: application.program,
          branch: application.confirmedCampus,
          shortlist_score: application.shortlistScore != null ? String(application.shortlistScore) : undefined,
        },
      });
    }
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
  //                            config.bands.experienceMonths) — same band
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

    if (dto.achievementScore !== undefined) application.achievementScore = Math.max(0, Math.min(5, Number(dto.achievementScore)));
    if (dto.penaltyScore !== undefined) application.penaltyScore = Math.max(0, Math.min(5, Math.abs(Number(dto.penaltyScore))));
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

      const hasEvaluations = submittedEvaluations.length > 0;
      interviewBreakdowns.push({
        interviewId: interview.id,
        interviewType: interview.interviewType,
        round: interview.round,
        status: interview.status,
        score: hasEvaluations ? Number(interviewScore.toFixed(2)) : null,
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
    let gdScore = gdScores.length ? gdScores.reduce((a, b) => a + b, 0) / gdScores.length : null;
    let piScore = piScores.length ? piScores.reduce((a, b) => a + b, 0) / piScores.length : null;

    // Fall back to application-level gdScore and piScore (evaluated on the Evaluation & Scoring card)
    if ((gdScore === null || gdScore === 0) && application.gdScore !== null && application.gdScore !== undefined) {
      gdScore = Number(application.gdScore);
    }
    if ((piScore === null || piScore === 0) && application.piScore !== null && application.piScore !== undefined) {
      piScore = Number(application.piScore);
    }

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
    const bestTestPercentile = bestEntrancePercentile(fullApplication.entranceTests);
    const testComponent = pointsFromBands(bestTestPercentile, config.bands.testPercentile ?? [], 'minPercentile');
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

    const expBands = config.bands.experienceMonths ?? (config.bands as any).experienceYears ?? [];
    const experienceComponent = pointsFromBands(effectiveMonths, expBands, 'minMonths');
    const maxExperienceScore = Math.max(0, ...expBands.map((b: any) => Number(b.points ?? b.score ?? 0)));
    // DEBUG — remove after confirming scores are correct
    console.log('[scoring] exp debug', {
      validatedMonths,
      autoCalcMonths,
      effectiveMonths,
      experienceComponent,
      maxExperienceScore,
      bandCount: expBands.length,
      bands: expBands,
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
    const compositeScore = Number(
      Math.max(
        0,
        Math.min(
          100,
          academicComponent + testComponent + experienceComponent + gdpiTotal + otherComponentsTotal,
        ),
      ).toFixed(2),
    );

    const qualifyingScore = config.qualifyingScore !== null && config.qualifyingScore !== undefined
      ? Number(config.qualifyingScore)
      : 50;
    const isQualified = compositeScore >= qualifyingScore;

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
      qualifyingScore,
      isQualified,
    };
  }

  async setDeclarationDate(
    orgId: string,
    declarationDate: string,
    autoAnnounce?: boolean,
    actorId?: string,
  ) {
    const config = await this.conversionConfigService.getOrCreate(orgId);
    const dateObj = new Date(declarationDate);
    const autoAnnounceVal = autoAnnounce !== undefined ? Boolean(autoAnnounce) : Boolean(config.autoAnnounceResults);

    await this.conversionConfigService.update(
      orgId,
      {
        resultsDeclarationDate: dateObj,
        autoAnnounceResults: autoAnnounceVal,
      } as any,
      actorId || '',
    );

    // If autoAnnounce is toggled and date is already in past or now, immediately announce
    if (autoAnnounceVal && dateObj <= new Date() && !config.resultsAnnounced) {
      this.logger.log(`Auto-announce date reached immediately upon setting date for org ${orgId}`);
      await this.announceResults(orgId, declarationDate, actorId);
    }

    // Format human-friendly declaration date for the email and logs
    const formattedDate = dateObj.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const portalUrl = this.configService?.get<string>('STUDENT_PORTAL_URL') || 'http://localhost:3001';

    // Send email to every applicant in this organization and record in communication history
    const applications = await this.applicationRepository.find({
      where: { organizationId: orgId },
    });

    let sentCount = 0;
    for (const app of applications) {
      if (!app.email) continue;
      const firstName = (app.name || '').trim().split(' ')[0] || 'Applicant';
      const subject = `Results Declaration Date Announced — ${app.applicationNo}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #111827; margin-top: 0;">GD & Personal Interview Results Announcement</h2>
          <p>Dear ${firstName},</p>
          <p>We are pleased to inform you that the evaluation results for your application <strong>${app.applicationNo}</strong> (${app.program || 'Admissions 2026'}) will be officially announced on:</p>
          <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; margin: 18px 0; border-radius: 4px;">
            <p style="margin: 0; color: #166534; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Scheduled Declaration Date & Time</p>
            <p style="margin: 4px 0 0 0; color: #14532d; font-size: 17px; font-weight: 700;">${formattedDate}</p>
          </div>
          <p>Your composite scores, section evaluations, and selection status will be available on your student portal at the scheduled time.</p>
          <p style="margin: 24px 0;">
            <a href="${portalUrl}" style="display:inline-block;padding:11px 22px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
              Access Student Portal
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b; margin: 0;">This is an automated notification from the Admissions Office. Application No: ${app.applicationNo}</p>
        </div>
      `;

      let sentSuccess = false;
      try {
        await this.mailerService.sendMail({
          to: app.email,
          subject,
          html,
        });
        sentSuccess = true;
        sentCount++;
      } catch (err: any) {
        this.logger.warn(`Failed to send declaration date email to ${app.email}: ${err?.message || err}`);
      }

      try {
        await this.communicationsService.create({
          organizationId: orgId,
          applicationNo: app.applicationNo,
          applicantName: app.name,
          recipientEmail: app.email,
          recipientPhone: app.primaryMobile,
          channel: 'Email',
          category: 'Results Declaration',
          subject,
          content: html,
          sender: 'Admissions Desk',
          status: sentSuccess ? 'Sent' : 'Failed',
        });
      } catch (e: any) {
        this.logger.warn(`Failed to create communication log for declaration date to ${app.applicationNo}: ${e?.message}`);
      }
    }

    return {
      success: true,
      declarationDate: dateObj,
      autoAnnounceResults: autoAnnounceVal,
      studentsNotified: sentCount,
      totalApplications: applications.length,
    };
  }

  async getAnnouncedResultsStatus(orgId: string) {
    const config = await this.conversionConfigService.getOrCreate(orgId);
    return {
      resultsAnnounced: Boolean(config.resultsAnnounced),
      resultsDeclarationDate: config.resultsDeclarationDate ?? null,
      autoAnnounceResults: Boolean(config.autoAnnounceResults),
      qualifyingScore: config.qualifyingScore !== null && config.qualifyingScore !== undefined ? Number(config.qualifyingScore) : 50,
    };
  }

  async announceResults(orgId: string, declarationDate?: string, actorId?: string) {
    const config = await this.conversionConfigService.getOrCreate(orgId);
    const qualifyingScore = config.qualifyingScore !== null && config.qualifyingScore !== undefined
      ? Number(config.qualifyingScore)
      : 50;

    const applications = await this.applicationRepository.find({
      where: { organizationId: orgId },
    });

    let selectedCount = 0;
    let notSelectedCount = 0;

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const validActorId = actorId && UUID_REGEX.test(actorId) ? actorId : undefined;

    for (const app of applications) {
      let isQualified = false;
      let compScore = 0;
      let gdpiTotal = 0;

      try {
        const breakdown = await this.computeCompositeScore(orgId, app.id);
        isQualified = breakdown.isQualified;
        compScore = Number(breakdown.compositeScore || 0);
        gdpiTotal = Number(breakdown.gdpiTotal || 0);
      } catch (e) {
        compScore = app.compositeScore !== null && app.compositeScore !== undefined ? Number(app.compositeScore) : 0;
        isQualified = compScore >= qualifyingScore;
        gdpiTotal = Number(app.gdpiTotal || (Number(app.gdScore || 0) + Number(app.piScore || 0)));
      }

      const newStatus = isQualified ? 'Selected' : 'Not Selected';
      app.shortlistStatus = newStatus;
      if (validActorId) app.updatedBy = validActorId;
      await this.applicationRepository.save(app);

      if (isQualified) selectedCount++;
      else notSelectedCount++;

      // Dispatch results announcement email to applicant
      if (app.email) {
        try {
          const baseUrl = this.configService?.get<string>('STUDENT_PORTAL_URL') ||
                          this.configService?.get<string>('FRONTEND_URL') ||
                          'http://localhost:3001';
          const loginUrl = `${baseUrl.replace(/\/$/, '')}/login`;

          await this.emailTemplatesService.sendTransactional({
            organizationId: orgId,
            categorySlug: 'results_scores_updated',
            to: app.email,
            applicationNo: app.applicationNo,
            applicantName: app.name,
            variables: {
              name: app.name,
              email: app.email,
              phone: app.primaryMobile,
              application_no: app.applicationNo,
              academic_session: app.academicSession,
              course: app.program,
              composite_score: String(compScore),
              gdpi_total: String(gdpiTotal),
              recommendation: isQualified ? 'Selected / Recommended for Admission' : 'Not Selected',
              status: newStatus,
              login_url: loginUrl,
            },
          });
        } catch (mailErr: any) {
          this.logger.warn(`Failed to send results announcement email to ${app.email}: ${mailErr?.message || mailErr}`);
        }
      }
    }

    await this.conversionConfigService.update(
      orgId,
      {
        resultsAnnounced: true,
        ...(declarationDate ? { resultsDeclarationDate: new Date(declarationDate) } : {}),
      } as any,
      validActorId,
    );

    return {
      success: true,
      totalUpdated: applications.length,
      selectedCount,
      notSelectedCount,
      resultsAnnounced: true,
      resultsDeclarationDate: declarationDate ? new Date(declarationDate) : config.resultsDeclarationDate,
    };
  }
}

