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
import { GdScoringSchemesService, STANDARD_SCHEME_ID } from './gd-scoring-schemes.service.js';
import { isCatExam } from './constants/interview-picklists.js';

type Band = { minPercent?: number; minPercentile?: number; minYears?: number; minMonths?: number; points: number };

export interface EntranceBreakdown {
  // 'best_overall' (default) or 'cat_split' (CAT and other exams separately)
  entranceScoringMode: 'best_overall' | 'cat_split';
  testComponent: number;
  maxTestScore: number;
  bestTestPercentile: number | null;
  bestTestName: string | null;
  // Filled only in 'cat_split' mode (null otherwise)
  catComponent: number | null;
  maxCatScore: number | null;
  catPercentile: number | null;
  otherTestComponent: number | null;
  maxOtherTestScore: number | null;
  otherTestPercentile: number | null;
  otherTestName: string | null;
}

export interface GdComponentBreakdown {
  key: string;
  label: string;
  interviewType: 'GD' | 'PI' | null;
  maxMarks: number;
  compositeWeight: number;
  includeInComposite: boolean;
  // null = not scored yet (no submitted panel evaluation and no marks entered)
  rawScore: number | null;
  contribution: number | null;
  source: 'evaluations' | 'manual' | 'legacy' | null;
  parameters: Array<{ key: string; name: string; maxMarks: number; score: number | null }>;
  remarks: string | null;
}

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

export interface CompositeScoreBreakdown extends EntranceBreakdown {
  applicationId: string;
  applicationNo: string;
  interviews: InterviewScoreBreakdown[];
  // Selected GD/PI scoring scheme and the per-component marks it produced.
  scheme: { id: string; name: string; isPredefined: boolean };
  gdComponents: GdComponentBreakdown[];
  maxGdpiTotal: number;
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
  catComponent: number | null;
  otherTestComponent: number | null;
  shortlistScore: number;
  shortlistStatus: 'Eligible' | 'Not Eligible';
  // Minimum criteria of the rule (Minimum_GPA, Minimum_Test_Score,
  // Work_Experience) the candidate did not meet. Any miss = Not Eligible.
  failedCriteria: string[];
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

function bestTest(
  records: Array<{ percentile?: number | string | null; testName?: string | null }> | undefined,
): { percentile: number; testName: string | null } | null {
  let best: { percentile: number; testName: string | null } | null = null;
  for (const rec of records ?? []) {
    if (rec.percentile === null || rec.percentile === undefined) continue;
    const val = Number(rec.percentile);
    if (!Number.isFinite(val)) continue;
    if (!best || val > best.percentile) best = { percentile: val, testName: rec.testName ?? null };
  }
  return best;
}

function maxPoints(bands: Band[] | undefined): number {
  return Math.max(0, ...(bands ?? []).map((b: any) => Number(b.points ?? b.score ?? 0)));
}

// Entrance-test component. Default ('best_overall', the original behaviour):
// the single best percentile across ALL tests on bands.testPercentile.
// 'cat_split' (owner request): CAT scored on bands.catPercentile x
// catWeight%, plus the best percentile among NON-CAT tests (XAT, MAT, CMAT,
// GMAT, GRE, ...) on bands.otherTestPercentile x otherTestWeight%.
export function computeEntranceComponent(
  tests: Array<{ percentile?: number | string | null; testName?: string | null }> | undefined,
  config: { bands: Record<string, Band[]>; entranceScoringMode?: string; catWeight?: number | string; otherTestWeight?: number | string },
): EntranceBreakdown {
  const overall = bestTest(tests);
  if (config.entranceScoringMode !== 'cat_split') {
    const bands = config.bands.testPercentile ?? [];
    return {
      entranceScoringMode: 'best_overall',
      testComponent: pointsFromBands(overall?.percentile ?? null, bands, 'minPercentile'),
      maxTestScore: maxPoints(bands),
      bestTestPercentile: overall?.percentile ?? null,
      bestTestName: overall?.testName ?? null,
      catComponent: null,
      maxCatScore: null,
      catPercentile: null,
      otherTestComponent: null,
      maxOtherTestScore: null,
      otherTestPercentile: null,
      otherTestName: null,
    };
  }

  const catWeight = config.catWeight !== undefined && config.catWeight !== null ? Number(config.catWeight) : 100;
  const otherWeight = config.otherTestWeight !== undefined && config.otherTestWeight !== null ? Number(config.otherTestWeight) : 100;
  const catBands = config.bands.catPercentile ?? config.bands.testPercentile ?? [];
  const otherBands = config.bands.otherTestPercentile ?? config.bands.testPercentile ?? [];

  const cat = bestTest((tests ?? []).filter((t) => isCatExam(t.testName)));
  const other = bestTest((tests ?? []).filter((t) => !isCatExam(t.testName)));

  const round2 = (n: number) => Number(n.toFixed(2));
  const catComponent = round2(pointsFromBands(cat?.percentile ?? null, catBands, 'minPercentile') * (catWeight / 100));
  const otherTestComponent = round2(pointsFromBands(other?.percentile ?? null, otherBands, 'minPercentile') * (otherWeight / 100));
  const maxCatScore = round2(maxPoints(catBands) * (catWeight / 100));
  const maxOtherTestScore = round2(maxPoints(otherBands) * (otherWeight / 100));

  return {
    entranceScoringMode: 'cat_split',
    testComponent: round2(catComponent + otherTestComponent),
    maxTestScore: round2(maxCatScore + maxOtherTestScore),
    bestTestPercentile: overall?.percentile ?? null,
    bestTestName: overall?.testName ?? null,
    catComponent,
    maxCatScore,
    catPercentile: cat?.percentile ?? null,
    otherTestComponent,
    maxOtherTestScore,
    otherTestPercentile: other?.percentile ?? null,
    otherTestName: other?.testName ?? null,
  };
}

@Injectable()
export class ScoringService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScoringService.name);
  // Orgs whose results announcement is running right now. The auto-announce
  // sweep runs every 30 s but one announcement (composite rollup + one email
  // per applicant) can take far longer, and resultsAnnounced is only set at
  // the end — without this guard every tick restarted it and re-emailed everyone.
  private readonly announcing = new Set<string>();

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
    private readonly gdSchemesService: GdScoringSchemesService,
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
        if (this.announcing.has(cfg.organizationId)) continue;
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
      .map((app) => this.scoreApplicationForShortlisting(app, rule, config));
  }

  private scoreApplicationForShortlisting(
    app: Application,
    rule: ShortlistingRule,
    config: { bands: Record<string, Band[]>; entranceScoringMode?: string; catWeight?: number; otherTestWeight?: number },
  ): ShortlistPreviewRow {
    const bands = config.bands;
    const tenth = app.educationRecords?.find((e) => e.level === '10th');
    const twelfth = app.educationRecords?.find((e) => e.level === '12th');
    const ug = app.educationRecords?.find((e) => e.level === 'UG');

    const tenthScore = pointsFromBands(parsePercentage(tenth?.percentageCgpa), bands.tenth, 'minPercent');
    const twelfthScore = pointsFromBands(parsePercentage(twelfth?.percentageCgpa), bands.twelfth, 'minPercent');
    const ugScore = pointsFromBands(parsePercentage(ug?.percentageCgpa), bands.ug, 'minPercent');
    const academicComponent = tenthScore + twelfthScore + ugScore;

    // Entrance tests: by default only the single highest percentile counts
    // (never summed); in 'cat_split' mode CAT and the best other exam are
    // scored separately (see computeEntranceComponent).
    const entrance = computeEntranceComponent(app.entranceTests, config);
    const testComponent = entrance.testComponent;

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

    // Rule minimums (scope fields Minimum_GPA, Minimum_Test_Score,
    // Work_Experience). Only checked when the rule sets them.
    const failedCriteria: string[] = [];
    if (rule.minGpa !== null && rule.minGpa !== undefined && Number(rule.minGpa) > 0) {
      const ugValue = parsePercentage(ug?.percentageCgpa);
      const minGpa = Number(rule.minGpa);
      // A minimum of 10 or less is read as a CGPA (compared with a UG value
      // of 10 or less); a larger minimum is read as a percentage.
      const comparable =
        ugValue === null ? null : minGpa <= 10 ? (ugValue <= 10 ? ugValue : ugValue / 9.5) : ugValue <= 10 ? ugValue * 9.5 : ugValue;
      if (comparable === null || comparable < minGpa) failedCriteria.push(`Minimum GPA ${minGpa}`);
    }
    if (rule.minTestScore !== null && rule.minTestScore !== undefined && Number(rule.minTestScore) > 0) {
      if (entrance.bestTestPercentile === null || entrance.bestTestPercentile < Number(rule.minTestScore)) {
        failedCriteria.push(`Minimum test score ${Number(rule.minTestScore)}`);
      }
    }
    if (rule.minExperienceYears !== null && rule.minExperienceYears !== undefined && Number(rule.minExperienceYears) > 0) {
      if ((claimedMonths ?? 0) / 12 < Number(rule.minExperienceYears)) {
        failedCriteria.push(`Work experience ${Number(rule.minExperienceYears)} yr`);
      }
    }

    const eligible = shortlistScore >= Number(rule.cutoffScore) && failedCriteria.length === 0;

    return {
      applicationId: app.id,
      applicationNo: app.applicationNo,
      name: app.name,
      academicComponent,
      testComponent,
      experienceComponent,
      catComponent: entrance.catComponent,
      otherTestComponent: entrance.otherTestComponent,
      shortlistScore: Number(shortlistScore.toFixed(2)),
      shortlistStatus: eligible ? 'Eligible' : 'Not Eligible',
      failedCriteria,
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
  async getCompositeScoreBreakdown(
    orgId: string,
    applicationNo: string,
    user?: { sub?: string; role?: string; email?: string },
  ): Promise<CompositeScoreBreakdown> {
    const application = await this.applicationRepository.findOne({ where: { applicationNo, organizationId: orgId } });
    if (!application) {
      throw new NotFoundException(`Application ${applicationNo} not found`);
    }
    // Students may only see their own application's breakdown.
    if (user?.role === 'student') {
      const owns =
        (!!application.studentId && application.studentId === user.sub) ||
        (!!user.email && !!application.email && application.email.toLowerCase() === user.email.toLowerCase());
      if (!owns) throw new NotFoundException(`Application ${applicationNo} not found`);
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
    const interviewFraction = new Map<string, number>();
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
      let weightSum = 0;
      for (const { sum, count, rubric } of byRubric.values()) {
        const maxScore = Number(rubric.maxScore) || 0;
        const weightagePercent = Number(rubric.weightagePercent) || 0;
        if (!maxScore) continue;
        const avgRaw = sum / count;
        interviewScore += (avgRaw / maxScore) * weightagePercent;
        weightSum += weightagePercent;
      }
      // Share of the possible weighted score (0..1), used by custom scoring
      // schemes to scale the panel's marks to the component's max marks.
      if (weightSum > 0) interviewFraction.set(interview.id, interviewScore / weightSum);

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

    // GD/PI marks come from the selected scoring scheme (owner request). The
    // predefined Standard template reproduces the original behaviour exactly:
    // GD and PI raw marks added to the composite as-is.
    //
    // Per component, the raw mark is taken from (first that exists):
    //  1. submitted panel evaluations of Completed interviews of the
    //     component's interview type (rounds of the same type are averaged,
    //     not summed - a re-round re-assesses the same axis). Standard
    //     template: the rubric-weighted total as before; custom schemes: the
    //     panel's share of the possible rubric score x the component's max.
    //  2. marks entered on the candidate's GD & Interview page
    //     (candidate_component_scores).
    //  3. Standard template only: the legacy Application.gdScore / piScore.
    // contribution = raw / maxMarks x compositeWeight (Standard: = raw).
    const scheme = await this.gdSchemesService.getActiveScheme(orgId);
    const manualRows = await this.gdSchemesService.getComponentScores(orgId, application.id, scheme.id);
    const manualByKey = new Map(manualRows.map((r) => [r.componentKey, r]));
    const isStandard = scheme.id === STANDARD_SCHEME_ID;

    const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
    const round2 = (n: number) => Number(n.toFixed(2));

    const gdComponents: GdComponentBreakdown[] = scheme.components.map((component) => {
      let rawScore: number | null = null;
      let source: GdComponentBreakdown['source'] = null;

      if (component.interviewType) {
        const typed = interviewBreakdowns.filter((i) => i.interviewType === component.interviewType && i.score !== null);
        const fromPanel = isStandard
          ? avg(typed.map((i) => i.score as number))
          : avg(
              typed
                .filter((i) => interviewFraction.has(i.interviewId))
                .map((i) => (interviewFraction.get(i.interviewId) as number) * component.maxMarks),
            );
        if (fromPanel !== null && fromPanel !== 0) {
          rawScore = fromPanel;
          source = 'evaluations';
        }
      }

      const manual = manualByKey.get(component.key);
      if (rawScore === null && manual && manual.rawScore !== null && manual.rawScore !== undefined) {
        rawScore = Number(manual.rawScore);
        source = 'manual';
      }

      if (rawScore === null && isStandard) {
        const legacy = component.key === 'gd' ? application.gdScore : component.key === 'pi' ? application.piScore : null;
        if (legacy !== null && legacy !== undefined) {
          rawScore = Number(legacy);
          source = 'legacy';
        }
      }

      const contribution =
        rawScore === null || !component.includeInComposite
          ? null
          : component.maxMarks > 0
            ? round2((rawScore / component.maxMarks) * component.compositeWeight)
            : 0;

      return {
        key: component.key,
        label: component.label,
        interviewType: component.interviewType,
        maxMarks: component.maxMarks,
        compositeWeight: component.compositeWeight,
        includeInComposite: component.includeInComposite,
        rawScore: rawScore !== null ? round2(rawScore) : null,
        contribution,
        source,
        parameters: component.parameters.map((p) => ({
          key: p.key,
          name: p.name,
          maxMarks: p.maxMarks,
          score:
            manual?.parameterScores && manual.parameterScores[p.key] !== undefined
              ? Number(manual.parameterScores[p.key])
              : null,
        })),
        remarks: manual?.remarks ?? null,
      };
    });

    const firstOfType = (type: 'GD' | 'PI') => gdComponents.find((c) => c.interviewType === type && c.rawScore !== null);
    const gdScore = firstOfType('GD')?.rawScore ?? null;
    const piScore = firstOfType('PI')?.rawScore ?? null;
    const gdpiTotal = round2(gdComponents.reduce((sum, c) => sum + (c.contribution ?? 0), 0));
    const maxGdpiTotal = round2(
      gdComponents.filter((c) => c.includeInComposite).reduce((sum, c) => sum + c.compositeWeight, 0),
    );

    const config = await this.conversionConfigService.getOrCreate(orgId);

    // Academic component scores from band config
    const tenth = fullApplication.educationRecords?.find((e) => e.level === '10th');
    const twelfth = fullApplication.educationRecords?.find((e) => e.level === '12th');
    const ug = fullApplication.educationRecords?.find((e) => e.level === 'UG');
    const tenthScore = pointsFromBands(parsePercentage(tenth?.percentageCgpa), config.bands.tenth ?? [], 'minPercent');
    const twelfthScore = pointsFromBands(parsePercentage(twelfth?.percentageCgpa), config.bands.twelfth ?? [], 'minPercent');
    const ugScore = pointsFromBands(parsePercentage(ug?.percentageCgpa), config.bands.ug ?? [], 'minPercent');
    const academicComponent = tenthScore + twelfthScore + ugScore;

    // Entrance test component (best overall by default, or CAT + best other
    // exam when the org switched on the CAT split).
    const entrance = computeEntranceComponent(fullApplication.entranceTests, config);
    const testComponent = entrance.testComponent;

    // Max possible scores per category (for UI display)
    const maxAcademicScore = maxPoints(config.bands.tenth) + maxPoints(config.bands.twelfth) + maxPoints(config.bands.ug);

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
    const maxExperienceScore = maxPoints(expBands);

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
      scheme: { id: scheme.id, name: scheme.name, isPredefined: scheme.isPredefined },
      gdComponents,
      maxGdpiTotal,
      gdScore,
      piScore,
      gdpiTotal,
      tenthScore,
      twelfthScore,
      ugScore,
      academicComponent,
      maxAcademicScore,
      ...entrance,
      testComponent,
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
    if (this.announcing.has(orgId)) {
      throw new BadRequestException('Results are already being announced for this organization. Please wait for it to finish.');
    }
    this.announcing.add(orgId);
    try {
      return await this.runAnnounceResults(orgId, declarationDate, actorId);
    } finally {
      this.announcing.delete(orgId);
    }
  }

  private async runAnnounceResults(orgId: string, declarationDate?: string, actorId?: string) {
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

      const hasWaitlist = Boolean(
        app.waitlistStatus &&
        app.waitlistStatus !== 'Not Applicable' &&
        app.waitlistStatus.trim() !== ''
      );

      let newStatus = app.shortlistStatus;
      if (hasWaitlist) {
        newStatus = app.waitlistStatus.toLowerCase().startsWith('wl') || app.waitlistStatus.toLowerCase().startsWith('waitlist')
          ? app.waitlistStatus
          : `Waitlist ${app.waitlistStatus}`;
      } else if (!newStatus || ['Shortlisted', 'Under Review', 'Review', 'pending'].includes(newStatus)) {
        newStatus = isQualified ? 'Selected' : 'Not Selected';
      }

      app.shortlistStatus = newStatus;
      if (validActorId) app.updatedBy = validActorId;
      await this.applicationRepository.save(app);

      if (newStatus === 'Selected') selectedCount++;
      else if (!hasWaitlist && !newStatus.toLowerCase().includes('waitlist')) notSelectedCount++;

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
              recommendation: hasWaitlist
                ? `Waitlisted (${app.waitlistStatus})`
                : (newStatus === 'Selected' ? 'Selected / Recommended for Admission' : 'Not Selected'),
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

