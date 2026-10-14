import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Brackets, In, LessThan, MoreThan, Not, Repository } from 'typeorm';
import { Application } from './entities/application.entity.js';
import { ApplicationStatusLog } from './entities/application-status-log.entity.js';
import { ApplicationWorkflowSettings } from './entities/application-workflow-settings.entity.js';
import { ApplicationDocument } from '../documents/entities/application-document.entity.js';
import { User } from '../users/entities/user.entity.js';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service.js';
import { MailerService } from '../notifications/mailer.service.js';
import { Role } from '../../common/enums/roles.enum.js';
import {
  APPLICATION_SOURCES,
  DEFAULT_MAX_DOCUMENT_SIZE_MB,
  DEFAULT_STAGE_SLA_DAYS,
  DOCUMENT_TYPES,
  FINAL_STAGES,
  STAGE_STEP,
  TRACKER_STAGES,
  TRACKER_STEPS,
  isUuid,
  toApplicationStatus,
} from './application-workflow.constants.js';

export interface RequestUser {
  sub: string;
  role: string;
  email?: string;
  organizationId?: string;
  name?: string;
}

interface StageChangeOptions {
  actorId?: string | null;
  actorName?: string | null;
  internalRemarks?: string | null;
  applicantVisible?: boolean;
  slaDays?: number | null;
  source?: 'manual' | 'rule' | 'bulk' | 'sla';
}

/** Roles allowed to move an application between stages manually. */
const STAGE_EDITOR_ROLES = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER] as string[];

@Injectable()
export class ApplicationStatusService {
  private readonly logger = new Logger(ApplicationStatusService.name);

  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(ApplicationStatusLog)
    private readonly logRepo: Repository<ApplicationStatusLog>,
    @InjectRepository(ApplicationWorkflowSettings)
    private readonly settingsRepo: Repository<ApplicationWorkflowSettings>,
    @InjectRepository(ApplicationDocument)
    private readonly docRepo: Repository<ApplicationDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly inApp: InAppNotificationsService,
    private readonly mailer: MailerService,
  ) {}

  // ===========================================================================
  // SETTINGS
  // ===========================================================================

  async getSettings(orgId: string): Promise<ApplicationWorkflowSettings> {
    let s = await this.settingsRepo.findOne({ where: { organizationId: orgId } });
    if (!s) {
      s = this.settingsRepo.create({
        organizationId: orgId,
        stageSlaDays: { ...DEFAULT_STAGE_SLA_DAYS },
        requiredDocumentTypes: [...DOCUMENT_TYPES],
        maxDocumentSizeMb: DEFAULT_MAX_DOCUMENT_SIZE_MB,
        notifyApplicantOnStageChange: true,
      });
      s = await this.settingsRepo.save(s);
    }
    s.stageSlaDays = { ...DEFAULT_STAGE_SLA_DAYS, ...(s.stageSlaDays || {}) };
    if (!Array.isArray(s.requiredDocumentTypes) || s.requiredDocumentTypes.length === 0) {
      s.requiredDocumentTypes = [...DOCUMENT_TYPES];
    }
    return s;
  }

  async updateSettings(
    orgId: string,
    dto: {
      stageSlaDays?: Record<string, number>;
      requiredDocumentTypes?: string[];
      maxDocumentSizeMb?: number;
      notifyApplicantOnStageChange?: boolean;
    },
  ) {
    const s = await this.getSettings(orgId);
    if (dto.stageSlaDays) {
      const clean: Record<string, number> = {};
      for (const [stage, days] of Object.entries(dto.stageSlaDays)) {
        if (!(TRACKER_STAGES as readonly string[]).includes(stage)) continue;
        const n = Number(days);
        if (Number.isFinite(n) && n >= 0) clean[stage] = Math.round(n);
      }
      s.stageSlaDays = { ...s.stageSlaDays, ...clean };
    }
    if (dto.requiredDocumentTypes) {
      const types = dto.requiredDocumentTypes.filter((t) => (DOCUMENT_TYPES as readonly string[]).includes(t));
      if (types.length === 0) throw new BadRequestException('At least one required document type is needed');
      s.requiredDocumentTypes = types;
    }
    if (dto.maxDocumentSizeMb !== undefined) {
      const mb = Number(dto.maxDocumentSizeMb);
      if (!Number.isFinite(mb) || mb < 1 || mb > 25) {
        throw new BadRequestException('Maximum document size must be between 1 and 25 MB');
      }
      s.maxDocumentSizeMb = Math.round(mb);
    }
    if (dto.notifyApplicantOnStageChange !== undefined) {
      s.notifyApplicantOnStageChange = !!dto.notifyApplicantOnStageChange;
    }
    return this.settingsRepo.save(s);
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  async findApplication(idOrNo: string, orgId: string): Promise<Application> {
    const app = await this.appRepo.findOne({
      where: isUuid(idOrNo)
        ? [
            { id: idOrNo, organizationId: orgId },
            { applicationNo: idOrNo, organizationId: orgId },
          ]
        : { applicationNo: idOrNo, organizationId: orgId },
    });
    if (!app) throw new NotFoundException(`Application ${idOrNo} not found`);
    return app;
  }

  /** Students may only touch their own application (matched by e-mail). */
  assertAccess(app: Application, user: RequestUser) {
    if (user.role === Role.STUDENT) {
      const a = (app.email || '').trim().toLowerCase();
      const u = (user.email || '').trim().toLowerCase();
      if (!a || !u || a !== u) {
        throw new ForbiddenException('You are not authorized to access this application');
      }
    }
  }

  async findStudentUserId(app: Application): Promise<string | null> {
    if (!app.email) return null;
    const user = await this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: app.email.trim() })
      .andWhere('u.role = :role', { role: Role.STUDENT })
      .getOne();
    return user?.id ?? null;
  }

  private async actorName(actorId?: string | null): Promise<string | null> {
    if (!actorId) return null;
    const u = await this.userRepo.findOne({ where: { id: actorId } });
    return u?.name ?? null;
  }

  // ===========================================================================
  // STAGE TRANSITIONS
  // ===========================================================================

  /** Writes a status log row and moves the application to `stage`. */
  async changeStage(app: Application, stage: string, opts: StageChangeOptions = {}): Promise<ApplicationStatusLog | null> {
    if (!(TRACKER_STAGES as readonly string[]).includes(stage)) {
      throw new BadRequestException(`Unknown stage "${stage}". Allowed: ${TRACKER_STAGES.join(', ')}`);
    }
    const previous = app.currentStage || null;
    if (previous === stage && opts.source === 'rule') return null;

    const settings = await this.getSettings(app.organizationId);
    const isFinal = FINAL_STAGES.includes(stage);
    const slaDays = isFinal ? null : opts.slaDays ?? settings.stageSlaDays[stage] ?? null;
    const now = new Date();

    await this.logRepo.update(
      { applicationId: app.id, isCurrent: true },
      { isCurrent: false },
    );

    const actorName = opts.actorName ?? (await this.actorName(opts.actorId));
    const log = await this.logRepo.save(
      this.logRepo.create({
        organizationId: app.organizationId,
        applicationId: app.id,
        previousStatus: previous,
        currentStatus: stage,
        statusChangedBy: opts.actorId ?? null,
        changedByType: opts.actorId ? 'Admin' : 'System',
        changedByName: opts.actorId ? actorName : 'System',
        internalRemarks: opts.internalRemarks ?? null,
        applicantVisible: opts.applicantVisible ?? true,
        slaDays,
        slaDueAt: slaDays != null ? new Date(now.getTime() + slaDays * 86400000) : null,
        slaBreached: false,
        isCurrent: true,
        source: opts.source ?? 'manual',
      }),
    );

    // Keep the master Application_Status in step with final decisions.
    const patch: Partial<Application> = { currentStage: stage, stageUpdatedAt: now, lastActivityAt: now };
    if (opts.source !== 'rule') {
      if (stage === 'Approved') patch.formStatus = 'accepted';
      if (stage === 'Rejected') patch.formStatus = 'rejected';
      if (stage === 'Under Review' && app.formStatus === 'submitted') patch.formStatus = 'under_review';
      // Moving a decided application back to a non-decision stage must clear the
      // decision, otherwise the rules engine immediately moves it back.
      if (stage !== 'Approved' && stage !== 'Rejected' && ['accepted', 'approved', 'rejected'].includes((app.formStatus || '').toLowerCase())) {
        patch.formStatus = app.submittedAt ? 'under_review' : 'incomplete';
      }
      if (stage === 'Verified') {
        patch.verificationStatus = 'verified';
        if (opts.actorId) {
          patch.verifiedBy = opts.actorId;
          patch.verifiedAt = now;
        }
      }
    }
    if (opts.actorId) patch.updatedBy = opts.actorId;
    await this.appRepo.update({ id: app.id }, patch);
    Object.assign(app, patch);

    if (log.applicantVisible && settings.notifyApplicantOnStageChange) {
      await this.notifyApplicant(app, stage, previous);
    }
    if (isFinal) {
      await this.inApp.notify({
        organizationId: app.organizationId,
        recipientRole: Role.APPLICATION_MANAGER,
        module: 'applications',
        type: 'final_decision',
        severity: stage === 'Approved' ? 'success' : stage === 'Rejected' ? 'warning' : 'info',
        title: `Application ${app.applicationNo} ${stage.toLowerCase()}`,
        body: `${app.name} — final decision recorded: ${stage}.`,
        link: `/organization/applications/${app.applicationNo}`,
        relatedEntityId: app.id,
      });
    }
    return log;
  }

  private async notifyApplicant(app: Application, stage: string, previous: string | null) {
    const recipientUserId = await this.findStudentUserId(app);
    const isFinal = FINAL_STAGES.includes(stage);
    const title = isFinal
      ? `Final decision on your application ${app.applicationNo}: ${stage}`
      : `Your application ${app.applicationNo} is now "${stage}"`;
    const body = isFinal
      ? `The admissions team has recorded a final decision on your application: ${stage}. Open the status tracker for details.`
      : `Your application moved from "${previous || 'New'}" to "${stage}".`;
    if (recipientUserId) {
      await this.inApp.notify({
        organizationId: app.organizationId,
        recipientUserId,
        module: 'applications',
        type: isFinal ? 'final_decision' : 'status_update',
        severity: stage === 'Rejected' ? 'warning' : stage === 'Approved' ? 'success' : 'info',
        title,
        body,
        link: '/my-application',
        relatedEntityId: app.id,
      });
    }
    if (app.email && (isFinal || stage === 'Fee Paid' || stage === 'Verified' || stage === 'Shortlisted')) {
      try {
        await this.mailer.sendMail({
          to: app.email,
          organizationId: app.organizationId,
          subject: title,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
            <h2 style="color:#111827;">Application status update</h2>
            <p>Dear ${app.name || 'Applicant'},</p>
            <p>${body}</p>
            <p>Application number: <strong>${app.applicationNo}</strong></p>
            <p>You can follow every step in the status tracker on your applicant portal.</p>
          </div>`,
          text: `${body} Application number: ${app.applicationNo}`,
        });
      } catch (e) {
        this.logger.warn(`Stage e-mail to ${app.email} failed: ${(e as Error).message}`);
      }
    }
  }

  /** Record the first stage for a newly created application. */
  async initialize(app: Application, actorId?: string | null) {
    const existing = await this.logRepo.count({ where: { applicationId: app.id } });
    if (existing > 0) return;
    // Record the stage the application is already in instead of resetting it.
    const start = (TRACKER_STAGES as readonly string[]).includes(app.currentStage) ? app.currentStage : 'Application Started';
    app.currentStage = '';
    await this.changeStage(app, start, {
      actorId: actorId ?? null,
      source: 'rule',
      internalRemarks: 'Application initiated',
    });
  }

  // ===========================================================================
  // RULES ENGINE — auto-advance
  // ===========================================================================

  async documentProgress(app: Application) {
    const settings = await this.getSettings(app.organizationId);
    const latest = await this.docRepo.find({ where: { applicationId: app.id, isLatest: true } });
    const required = settings.requiredDocumentTypes;
    const byType = new Map<string, ApplicationDocument>();
    for (const d of latest) byType.set(d.documentType, d);
    const uploaded = required.filter((t) => {
      const d = byType.get(t);
      return d && d.verificationStatus !== 'Rejected' && !d.reuploadRequired;
    });
    const approved = required.filter((t) => byType.get(t)?.verificationStatus === 'Approved');
    const rejected = latest.filter((d) => d.verificationStatus === 'Rejected' || d.reuploadRequired);
    const reviewed = latest.some((d) => d.verificationStatus !== 'Pending');
    return {
      required,
      uploaded,
      approved,
      missing: required.filter((t) => !uploaded.includes(t)),
      rejected: rejected.map((d) => d.documentType),
      allUploaded: required.length > 0 && uploaded.length === required.length,
      allApproved: required.length > 0 && approved.length === required.length,
      anyReviewed: reviewed,
    };
  }

  private async computeRuleStage(app: Application): Promise<string> {
    const fs = (app.formStatus || '').toLowerCase();
    if (fs === 'accepted' || fs === 'approved') return 'Approved';
    if (fs === 'rejected') return 'Rejected';
    if (app.waitlistStatus && !['', 'none', 'removed'].includes(app.waitlistStatus.toLowerCase())) return 'Waitlisted';
    if (app.shortlistStatus === 'Shortlisted') return 'Shortlisted';

    const docs = await this.documentProgress(app);
    const paid = ['success', 'paid'].includes((app.paymentStatus || '').toLowerCase());
    if (app.verificationStatus === 'verified' || (paid && docs.allApproved)) return 'Verified';
    if (paid && docs.allUploaded && (['submitted', 'under_review'].includes(fs) || docs.anyReviewed)) {
      return 'Under Review';
    }
    if (paid && docs.allUploaded) return 'Documents Uploaded';
    if (paid) return 'Fee Paid';
    return 'Application Started';
  }

  /**
   * Status rules engine: moves the application forward when its data says so
   * (fee paid, documents uploaded, all documents approved, shortlisted, final
   * decision recorded elsewhere). Never moves backwards automatically, never
   * overrides a final stage except with another final decision.
   * Intermediate stages are logged so the timeline stays complete.
   */
  async evaluate(applicationId: string, actorId?: string | null): Promise<string | null> {
    try {
      const app = await this.appRepo.findOne({ where: { id: applicationId } });
      if (!app) return null;
      if (!app.currentStage || (await this.logRepo.count({ where: { applicationId: app.id } })) === 0) {
        await this.initialize(app, null);
      }
      const target = await this.computeRuleStage(app);
      const current = app.currentStage || 'Application Started';
      if (target === current) return current;

      const currentFinal = FINAL_STAGES.includes(current);
      const targetFinal = FINAL_STAGES.includes(target);
      if (currentFinal && !targetFinal) return current;

      const curStep = STAGE_STEP[current] ?? 0;
      const tgtStep = STAGE_STEP[target] ?? 0;
      if (!targetFinal && tgtStep <= curStep) return current;

      // Walk through skipped intermediate steps so the tracker shows each one.
      const path: string[] = [];
      if (!targetFinal) {
        const linear = ['Application Started', 'Fee Paid', 'Documents Uploaded', 'Under Review'];
        for (const s of linear) {
          const step = STAGE_STEP[s];
          if (step > curStep && step < tgtStep) path.push(s);
        }
      }
      path.push(target);
      for (const s of path) {
        await this.changeStage(app, s, {
          actorId: null,
          source: 'rule',
          internalRemarks: 'Automatically moved by status rules',
          applicantVisible: true,
        });
      }
      return target;
    } catch (e) {
      this.logger.error(`Rules engine failed for ${applicationId}: ${(e as Error).message}`);
      return null;
    }
  }

  // ===========================================================================
  // MANUAL / BULK CHANGES
  // ===========================================================================

  async manualChange(
    orgId: string,
    idOrNo: string,
    user: RequestUser,
    dto: { stage: string; internalRemarks?: string; applicantVisible?: boolean; slaDays?: number },
  ) {
    if (!STAGE_EDITOR_ROLES.includes(user.role)) {
      throw new ForbiddenException('Your role cannot change application stages');
    }
    const app = await this.findApplication(idOrNo, orgId);
    if (app.currentStage === dto.stage) {
      throw new BadRequestException(`Application is already in "${dto.stage}"`);
    }
    const log = await this.changeStage(app, dto.stage, {
      actorId: user.sub,
      internalRemarks: dto.internalRemarks ?? null,
      applicantVisible: dto.applicantVisible ?? true,
      slaDays: dto.slaDays ?? null,
      source: 'manual',
    });
    return { application: this.toSummary(app), log };
  }

  async bulkChange(
    orgId: string,
    user: RequestUser,
    dto: { applicationIds: string[]; stage: string; internalRemarks?: string; applicantVisible?: boolean },
  ) {
    if (!STAGE_EDITOR_ROLES.includes(user.role)) {
      throw new ForbiddenException('Your role cannot change application stages');
    }
    const ids = Array.from(new Set(dto.applicationIds || [])).filter(isUuid);
    if (ids.length === 0) throw new BadRequestException('Select at least one application');
    const apps = await this.appRepo.find({ where: { id: In(ids), organizationId: orgId } });
    let updated = 0;
    const skipped: string[] = [];
    for (const app of apps) {
      if (app.currentStage === dto.stage) {
        skipped.push(app.applicationNo);
        continue;
      }
      await this.changeStage(app, dto.stage, {
        actorId: user.sub,
        internalRemarks: dto.internalRemarks ?? null,
        applicantVisible: dto.applicantVisible ?? true,
        source: 'bulk',
      });
      updated++;
    }
    return { updated, skipped, notFound: ids.length - apps.length };
  }

  async bulkAssign(orgId: string, user: RequestUser, dto: { applicationIds: string[]; assignedCounselorId: string | null }) {
    if (!STAGE_EDITOR_ROLES.includes(user.role)) {
      throw new ForbiddenException('Your role cannot reassign applications');
    }
    if (dto.assignedCounselorId) await this.assertOrgUser(orgId, dto.assignedCounselorId);
    const ids = (dto.applicationIds || []).filter(isUuid);
    if (ids.length === 0) throw new BadRequestException('Select at least one application');
    const res = await this.appRepo.update(
      { id: In(ids), organizationId: orgId },
      { assignedCounselorId: dto.assignedCounselorId as any, updatedBy: user.sub, lastActivityAt: new Date() },
    );
    return { updated: res.affected ?? 0 };
  }

  /** Staff who can be assigned as counsellor (for pickers; no admin-only user API needed). */
  async counsellors(orgId: string) {
    const users = await this.userRepo.find({
      where: { organizationId: orgId, role: In([Role.COUNSELOR, Role.APPLICATION_MANAGER, Role.ORG_ADMIN]) as any },
      order: { name: 'ASC' },
    });
    return users.filter((u: any) => u.isActive !== false).map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  }

  private async assertOrgUser(orgId: string, userId: string) {
    if (!isUuid(userId)) throw new BadRequestException('Invalid counsellor');
    const u = await this.userRepo.findOne({ where: { id: userId, organizationId: orgId } });
    if (!u || u.role === Role.STUDENT) throw new BadRequestException('Counsellor not found in this organization');
  }

  /** Application master fields editable from the admin view. */
  async updateMaster(
    orgId: string,
    idOrNo: string,
    user: RequestUser,
    dto: { assignedCounselorId?: string | null; applicationSource?: string | null; academicSession?: string },
  ) {
    if (!STAGE_EDITOR_ROLES.includes(user.role) && user.role !== Role.COUNSELOR) {
      throw new ForbiddenException('Your role cannot edit application master fields');
    }
    const app = await this.findApplication(idOrNo, orgId);
    if (dto.assignedCounselorId !== undefined) {
      if (user.role === Role.COUNSELOR) throw new ForbiddenException('Counsellors cannot reassign applications');
      if (dto.assignedCounselorId) await this.assertOrgUser(orgId, dto.assignedCounselorId);
      app.assignedCounselorId = dto.assignedCounselorId as any;
    }
    if (dto.applicationSource !== undefined) {
      if (dto.applicationSource && !(APPLICATION_SOURCES as readonly string[]).includes(dto.applicationSource)) {
        throw new BadRequestException(`Application source must be one of ${APPLICATION_SOURCES.join(', ')}`);
      }
      app.applicationSource = dto.applicationSource || null;
    }
    if (dto.academicSession) app.academicSession = dto.academicSession;
    app.updatedBy = user.sub;
    app.lastActivityAt = new Date();
    await this.appRepo.save(app);
    return this.toSummary(app);
  }

  // ===========================================================================
  // VIEWS
  // ===========================================================================

  toSummary(app: Application & { assignedCounselor?: User; course?: any; student?: any }) {
    return {
      id: app.id,
      applicationId: app.id,
      applicationNo: app.applicationNo,
      applicantId: app.studentId,
      applicantName: app.name,
      email: app.email,
      phone: app.primaryMobile,
      programApplied: app.program,
      courseId: app.courseId,
      academicYear: app.academicSession,
      applicationStatus: toApplicationStatus(app.formStatus),
      formStatus: app.formStatus,
      currentStage: app.currentStage || 'Application Started',
      stageUpdatedAt: app.stageUpdatedAt,
      applicationStartDate: app.createdAt,
      applicationSubmissionDate: app.submittedAt,
      assignedCounsellorId: app.assignedCounselorId,
      assignedCounsellorName: app.assignedCounselor?.name ?? null,
      lastUpdated: app.updatedAt,
      applicationSource: app.applicationSource,
      paymentStatus: app.paymentStatus,
      verificationStatus: app.verificationStatus,
    };
  }

  async dashboard(
    orgId: string,
    user: RequestUser,
    q: {
      page?: number;
      limit?: number;
      search?: string;
      stage?: string;
      applicationStatus?: string;
      source?: string;
      counsellorId?: string;
      academicYear?: string;
      slaBreached?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 20));
    const qb = this.appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.assignedCounselor', 'counsellor')
      .where('app.organization_id = :orgId', { orgId });

    // Role-based visibility: counsellors see only their assigned applications.
    if (user.role === Role.COUNSELOR) {
      qb.andWhere('app.assigned_counselor_id = :me', { me: user.sub });
    }
    if (q.stage && q.stage !== 'all') qb.andWhere('app.current_stage = :stage', { stage: q.stage });
    if (q.source && q.source !== 'all') qb.andWhere('app.application_source = :source', { source: q.source });
    if (q.counsellorId && q.counsellorId !== 'all') {
      if (q.counsellorId === 'unassigned') qb.andWhere('app.assigned_counselor_id IS NULL');
      else qb.andWhere('app.assigned_counselor_id = :cid', { cid: q.counsellorId });
    }
    if (q.academicYear && q.academicYear !== 'all') qb.andWhere('app.academic_session = :ay', { ay: q.academicYear });
    if (q.applicationStatus && q.applicationStatus !== 'all') {
      const map: Record<string, string[]> = {
        Started: ['draft', 'incomplete'],
        Submitted: ['submitted'],
        'Under Review': ['under_review', 'in_progress'],
        Approved: ['accepted', 'approved'],
        Rejected: ['rejected'],
      };
      qb.andWhere('app.form_status IN (:...fs)', { fs: map[q.applicationStatus] || [q.applicationStatus] });
    }
    if (q.search) {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where('app.name ILIKE :s', { s: `%${q.search}%` })
            .orWhere('app.email ILIKE :s')
            .orWhere('app.application_no ILIKE :s')
            .orWhere('app.primary_mobile ILIKE :s'),
        ),
      );
    }
    if (q.dateFrom) qb.andWhere('app.created_at >= :df', { df: new Date(q.dateFrom) });
    if (q.dateTo) {
      const to = new Date(q.dateTo);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('app.created_at <= :dt', { dt: to });
    }
    if (q.slaBreached === 'true') {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM application_status_logs l WHERE l.application_id = app.id AND l.is_current = true AND l.sla_breached = true)`,
      );
    }

    const [rows, total] = await qb
      .orderBy('app.updated_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const currentLogs = rows.length
      ? await this.logRepo.find({ where: { applicationId: In(rows.map((r) => r.id)), isCurrent: true } })
      : [];
    const logByApp = new Map(currentLogs.map((l) => [l.applicationId, l]));

    const data = rows.map((app) => {
      const log = logByApp.get(app.id);
      return {
        ...this.toSummary(app),
        slaDays: log?.slaDays ?? null,
        slaDueAt: log?.slaDueAt ?? null,
        slaBreached: log?.slaBreached ?? false,
      };
    });

    // Stage counts for the dashboard cards (same role scope, no other filters).
    const countQb = this.appRepo
      .createQueryBuilder('app')
      .select('app.current_stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('app.organization_id = :orgId', { orgId });
    if (user.role === Role.COUNSELOR) countQb.andWhere('app.assigned_counselor_id = :me', { me: user.sub });
    const counts = await countQb.groupBy('app.current_stage').getRawMany();
    const stageCounts: Record<string, number> = {};
    for (const s of TRACKER_STAGES) stageCounts[s] = 0;
    for (const c of counts) stageCounts[c.stage || 'Application Started'] = Number(c.count);

    const breachQb = this.logRepo
      .createQueryBuilder('l')
      .innerJoin('l.application', 'app')
      .where('l.organization_id = :orgId', { orgId })
      .andWhere('l.is_current = true')
      .andWhere('l.sla_breached = true');
    if (user.role === Role.COUNSELOR) breachQb.andWhere('app.assigned_counselor_id = :me', { me: user.sub });
    const slaBreachedCount = await breachQb.getCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit), stageCounts, slaBreachedCount };
  }

  async timeline(orgId: string, idOrNo: string, user: RequestUser) {
    const app = await this.findApplication(idOrNo, orgId);
    this.assertAccess(app, user);
    const isApplicant = user.role === Role.STUDENT;
    const logs = await this.logRepo.find({
      where: isApplicant ? { applicationId: app.id, applicantVisible: true } : { applicationId: app.id },
      order: { statusChangeDate: 'ASC', statusLogNo: 'ASC' },
    });
    return logs.map((l) => ({
      id: l.id,
      statusLogId: l.statusLogNo,
      applicationId: l.applicationId,
      previousStatus: l.previousStatus,
      currentStatus: l.currentStatus,
      statusChangedBy: isApplicant ? l.changedByType : l.changedByName || l.changedByType,
      changedByType: l.changedByType,
      statusChangeDate: l.statusChangeDate,
      internalRemarks: isApplicant ? undefined : l.internalRemarks,
      applicantVisible: l.applicantVisible,
      slaDays: l.slaDays,
      slaDueAt: l.slaDueAt,
      slaBreached: l.slaBreached,
      isCurrent: l.isCurrent,
      source: isApplicant ? undefined : l.source,
    }));
  }

  /** Applicant view — step-wise tracker. */
  async progress(orgId: string, idOrNo: string, user: RequestUser) {
    const app = await this.findApplication(idOrNo, orgId);
    this.assertAccess(app, user);
    await this.evaluate(app.id);
    const fresh = await this.findApplication(app.id, orgId);
    const stage = fresh.currentStage || 'Application Started';
    const currentStep = STAGE_STEP[stage] ?? 0;
    const visibleLogs = await this.logRepo.find({
      where: { applicationId: fresh.id, applicantVisible: true },
      order: { statusChangeDate: 'ASC' },
    });
    const reachedAt = (names: string[]) => {
      const l = visibleLogs.filter((x) => names.includes(x.currentStatus)).pop();
      return l?.statusChangeDate ?? null;
    };
    const stepStages = [
      ['Application Started'],
      ['Fee Paid'],
      ['Documents Uploaded'],
      ['Under Review'],
      ['Verified', 'Shortlisted'],
      ['Approved', 'Rejected', 'Waitlisted'],
    ];
    const docs = await this.documentProgress(fresh);
    const steps = TRACKER_STEPS.map((label, i) => ({
      key: i,
      label: i === currentStep && (i === 4 || i === 5) ? stage : label,
      state: i < currentStep ? 'completed' : i === currentStep ? (i === 5 ? 'completed' : 'current') : 'upcoming',
      reachedAt: i <= currentStep ? reachedAt(stepStages[i]) : null,
    }));
    return {
      applicationId: fresh.id,
      applicationNo: fresh.applicationNo,
      applicationStatus: toApplicationStatus(fresh.formStatus),
      currentStage: stage,
      currentStep,
      isFinal: FINAL_STAGES.includes(stage),
      percent: Math.round((Math.min(currentStep, 5) / 5) * 100),
      steps,
      paymentStatus: fresh.paymentStatus,
      documents: docs,
      nextAction:
        currentStep === 0
          ? 'Pay the application fee'
          : docs.rejected.length > 0
          ? `Re-upload: ${docs.rejected.join(', ')}`
          : docs.missing.length > 0
          ? `Upload: ${docs.missing.join(', ')}`
          : FINAL_STAGES.includes(stage)
          ? null
          : 'Wait for the admissions team to review your application',
    };
  }

  // ===========================================================================
  // CRON — rules sync + SLA breach detection
  // ===========================================================================

  /** Picks up changes made by other modules (decisions, shortlisting, payments). */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncRecentlyChanged() {
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000);
      const apps = await this.appRepo.find({
        select: ['id'],
        where: { updatedAt: MoreThan(since), currentStage: Not(In(FINAL_STAGES)) },
        take: 500,
      });
      for (const a of apps) await this.evaluate(a.id);
    } catch (e) {
      this.logger.error(`Status sync failed: ${(e as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkSlaBreaches() {
    try {
      const overdue = await this.logRepo.find({
        where: { isCurrent: true, slaBreached: false, slaDueAt: LessThan(new Date()) },
        relations: ['application'],
        take: 500,
      });
      for (const log of overdue) {
        try {
        if (FINAL_STAGES.includes(log.currentStatus)) continue;
        log.slaBreached = true;
        await this.logRepo.save(log);
        const app = log.application;
        if (!app) continue;
        const payload = {
          organizationId: log.organizationId,
          module: 'applications',
          type: 'sla_breach',
          severity: 'warning' as const,
          title: `SLA breached: ${app.applicationNo} in "${log.currentStatus}"`,
          body: `${app.name}'s application has been in "${log.currentStatus}" for more than ${log.slaDays} day(s).`,
          link: `/organization/applications/status-tracker?stage=${encodeURIComponent(log.currentStatus)}&slaBreached=true`,
          relatedEntityId: app.id,
          metadata: { stage: log.currentStatus, slaDays: log.slaDays, slaDueAt: log.slaDueAt },
        };
        await this.inApp.notify({ ...payload, recipientRole: Role.APPLICATION_MANAGER });
        await this.inApp.notify({ ...payload, recipientRole: Role.ORG_ADMIN });
        if (app.assignedCounselorId) {
          await this.inApp.notify({ ...payload, recipientUserId: app.assignedCounselorId });
        }
        } catch (e) {
          this.logger.error(`SLA check failed for log ${log.id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`SLA check failed: ${(e as Error).message}`);
    }
  }
}
