import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity.js';
import { LeadActivity } from './entities/lead-activity.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { AcademicSession } from '../academic-sessions/entities/academic-session.entity.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { CapturedLeadInput, splitName } from './lead-field-mapper.js';
import { LeadSourceTrackingService } from './lead-source-tracking.service.js';
import { DuplicateMatch, LeadDuplicateService } from './lead-duplicate.service.js';
import { LeadScoringService } from './lead-scoring.service.js';
import { AssignmentResult, LeadAssignmentService } from './lead-assignment.service.js';
import { LeadSettingsService } from './lead-settings.service.js';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service.js';

export interface IngestContext {
  /** Created From: Web, API, Import, Chatbot, Social, Portal, Event, Manual */
  createdFrom: string;
  channelSource?: string | null;
  /** capture = inbound channel (re-entry of the same lead is folded into the existing record);
   *  manual = created by staff (duplicates are flagged, never folded) */
  mode?: 'capture' | 'manual';
  /** enable fuzzy Name + City matching (imported lists) */
  fuzzy?: boolean;
  actorId?: string | null;
  /** extra text for the "created" activity, e.g. "Facebook Lead Ads form 123" */
  note?: string | null;
}

export type IngestOutcome = 'created' | 'reentry' | 'flagged_duplicate';

export interface IngestResult {
  lead: Lead;
  outcome: IngestOutcome;
  match?: { leadId: string; confidence: number; reasons: string[] } | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEAD_LINK = (id: string) => `/organization/lead-manager/edit?id=${id}`;

/**
 * Scope data flow:
 *  1 captured via any source → 2 enters CRM (API / webhook / import) → 3 source tracking appended →
 *  4 scored → 5 routed to a counselor → 6 duplicates checked & merged → 7 counselor follows up.
 * Duplicate detection runs before persisting so that re-entry through another channel
 * never creates a second record.
 */
@Injectable()
export class LeadPipelineService {
  private readonly logger = new Logger(LeadPipelineService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private readonly activityRepo: Repository<LeadActivity>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(AcademicSession)
    private readonly sessionRepo: Repository<AcademicSession>,
    private readonly sourceTracking: LeadSourceTrackingService,
    private readonly duplicates: LeadDuplicateService,
    private readonly scoring: LeadScoringService,
    private readonly assignment: LeadAssignmentService,
    private readonly settings: LeadSettingsService,
    private readonly notifications: InAppNotificationsService,
  ) {}

  /** Resolves Program / Course interest and Intake / Session against org master data. */
  async resolveProgramAndIntake(orgId: string, input: CapturedLeadInput) {
    if (input.courseId && !UUID_RE.test(input.courseId)) {
      input.programInterest ||= input.courseId;
      input.courseId = null;
    }
    if (input.courseId) {
      const course = await this.courseRepo.findOne({ where: { id: input.courseId, organizationId: orgId } });
      if (course) input.programInterest ||= course.name;
      else input.courseId = null;
    } else if (input.programInterest) {
      const key = input.programInterest.trim().toLowerCase();
      const course = await this.courseRepo
        .createQueryBuilder('c')
        .where('c.organization_id = :orgId', { orgId })
        .andWhere('(LOWER(c.name) = :key OR LOWER(c.code) = :key OR c.id::text = :key)', { key })
        .getOne();
      if (course) {
        input.courseId = course.id;
        input.programInterest = course.name;
      }
    }

    if (input.intakeSessionId && !UUID_RE.test(input.intakeSessionId)) {
      input.intake ||= input.intakeSessionId;
      input.intakeSessionId = null;
    }
    if (input.intakeSessionId) {
      const s = await this.sessionRepo.findOne({ where: { id: input.intakeSessionId, organizationId: orgId } });
      if (s) input.intake ||= s.displayName || s.name;
      else input.intakeSessionId = null;
    } else if (input.intake) {
      const key = input.intake.trim().toLowerCase();
      const s = await this.sessionRepo
        .createQueryBuilder('s')
        .where('s.organization_id = :orgId', { orgId })
        .andWhere('(LOWER(s.name) = :key OR LOWER(s.display_name) = :key)', { key })
        .getOne();
      if (s) {
        input.intakeSessionId = s.id;
        input.intake = s.displayName || s.name;
      }
    }
  }

  /** Drops a branch id that is not a branch of this organization (public forms send it as free input). */
  async resolveBranch(orgId: string, input: { branchId?: string | null }) {
    if (!input.branchId) return;
    const ok =
      UUID_RE.test(input.branchId) &&
      (await this.leadRepo.manager.count(Branch, { where: { id: input.branchId, organizationId: orgId } })) > 0;
    if (!ok) input.branchId = null;
  }

  async ingest(orgId: string, rawInput: CapturedLeadInput, ctx: IngestContext): Promise<IngestResult> {
    const mode = ctx.mode ?? 'capture';
    const input = splitName({ ...rawInput });
    if (input.email) input.email = input.email.trim().toLowerCase();

    // 2-3: normalize + source tracking
    await this.resolveProgramAndIntake(orgId, input);
    await this.resolveBranch(orgId, input);
    await this.sourceTracking.apply(orgId, input, { createdFrom: ctx.createdFrom, channelSource: ctx.channelSource });
    const touch = this.sourceTracking.touchPoint(input, ctx.createdFrom);

    // duplicate check (needed up-front to block re-entry through another channel)
    const settings = await this.settings.get(orgId);
    const matches = await this.duplicates.findMatches(
      { ...input, organizationId: orgId },
      { fuzzy: ctx.fuzzy ?? false },
    );
    const best: DuplicateMatch | undefined = matches[0];

    if (best && mode === 'capture' && best.confidence >= settings.reentryBlockThreshold) {
      const lead = await this.applyReentry(best.lead, input, touch, ctx, best);
      return {
        lead,
        outcome: 'reentry',
        match: { leadId: best.lead.id, confidence: best.confidence, reasons: best.reasons },
      };
    }

    const flagged = !!best && best.confidence >= settings.duplicateFlagThreshold;

    const lead = this.leadRepo.create({
      organizationId: orgId,
      branchId: input.branchId ?? undefined,
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      email: input.email ?? undefined,
      phone: input.phone ?? undefined,
      country: input.country ?? undefined,
      state: input.state ?? undefined,
      city: input.city ?? undefined,
      dateOfBirth: input.dateOfBirth ?? null,
      studentId: input.studentId ?? null,
      channelSource: input.channelSource ?? null,
      formName: input.formName ?? null,
      formId: input.formId ?? undefined,
      courseId: input.courseId ?? undefined,
      programInterest: input.programInterest ?? null,
      intake: input.intake ?? null,
      intakeSessionId: input.intakeSessionId ?? null,
      source: input.source ?? undefined,
      sourceDetail: input.sourceDetail ?? undefined,
      sourceType: input.sourceType ?? null,
      subSource: input.subSource ?? null,
      campaignId: input.campaignId ?? undefined,
      campaignName: input.campaignName ?? null,
      utmSource: input.utmSource ?? undefined,
      utmMedium: input.utmMedium ?? undefined,
      utmCampaign: input.utmCampaign ?? undefined,
      utmTerm: input.utmTerm ?? null,
      utmContent: input.utmContent ?? null,
      submissionUrl: input.submissionUrl ?? null,
      referrerUrl: input.referrerUrl ?? null,
      createdFrom: ctx.createdFrom,
      firstTouch: touch,
      lastTouch: touch,
      touchCount: 1,
      testType: input.testType ?? null,
      testScore: input.testScore ?? null,
      gpa: input.gpa ?? null,
      workExperienceYears: input.workExperienceYears ?? null,
      engagement: { ...(input.engagement || {}) },
      emailBounced: false,
      followUpStatus: input.followUpStatus || 'Pending',
      nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : undefined,
      status:
        input.status && input.status !== LeadStatus.MERGED && (Object.values(LeadStatus) as string[]).includes(input.status)
          ? (input.status as LeadStatus)
          : LeadStatus.UNVERIFIED,
      rawPayload: input.rawPayload || {},
      isDuplicate: flagged,
      duplicateCount: 0,
      masterLeadId: flagged ? best!.lead.id : null,
      duplicateConfidence: flagged ? best!.confidence : null,
      duplicateReason: flagged ? best!.reasons.join(', ') : null,
    });
    if (lead.followUpStatus === 'Pending' && lead.nextFollowUpAt) lead.followUpStatus = 'Scheduled';

    // 4: score
    await this.scoring.applyScore(lead);

    // 5: route
    let assignment: AssignmentResult | null = null;
    if (input.assignedTo) {
      assignment = {
        userId: input.assignedTo,
        timestamp: new Date(),
        ruleText: 'Manual assignment at creation',
      };
    } else if (flagged && best!.lead.assignedTo) {
      assignment = {
        userId: best!.lead.assignedTo,
        timestamp: new Date(),
        ruleText: `Potential duplicate of an existing lead → same owner (${best!.confidence}% confidence)`,
      };
    } else {
      assignment = await this.assignment.route(lead);
    }
    if (assignment) {
      lead.assignedTo = assignment.userId;
      lead.assignedAt = assignment.timestamp;
      lead.assignmentRule = assignment.ruleText;
    }

    const saved = await this.leadRepo.save(lead);

    await this.activityRepo.save(
      this.activityRepo.create({
        leadId: saved.id,
        organizationId: orgId,
        actorId: ctx.actorId ?? undefined,
        action: 'created',
        content:
          `Lead captured via ${saved.channelSource || ctx.createdFrom} (created from ${ctx.createdFrom})` +
          (ctx.note ? ` — ${ctx.note}` : ''),
        newStatus: saved.status,
        metadata: { touch, score: saved.score, scoreBand: saved.scoreBand },
      }),
    );
    if (assignment) {
      await this.logAssignment(saved, null, assignment, ctx.actorId ?? null, 'auto_assigned');
    }

    // 6: duplicates flagged for admin review
    if (flagged) {
      await this.activityRepo.save(
        this.activityRepo.create({
          leadId: saved.id,
          organizationId: orgId,
          action: 'duplicate_flagged',
          content: `Potential duplicate of lead ${best!.lead.id} (${best!.confidence}% — ${best!.reasons.join(', ')})`,
          metadata: { masterLeadId: best!.lead.id, confidence: best!.confidence, reasons: best!.reasons },
        }),
      );
      for (const role of ['org_admin', 'lead_manager']) {
        await this.notifications.notify({
          organizationId: orgId,
          recipientRole: role,
          module: 'leads',
          type: 'lead_duplicate',
          severity: 'warning',
          title: 'Potential duplicate lead',
          body: `${this.name(saved)} looks like an existing lead (${best!.confidence}% — ${best!.reasons.join(', ')}). Review and merge.`,
          link: '/organization/lead-manager/duplicates',
          relatedEntityId: saved.id,
          metadata: { masterLeadId: best!.lead.id },
        });
      }
    }

    return {
      lead: saved,
      outcome: flagged ? 'flagged_duplicate' : 'created',
      match: best ? { leadId: best.lead.id, confidence: best.confidence, reasons: best.reasons } : null,
    };
  }

  /** Same lead came in again (any channel): enrich the existing record instead of creating a new one. */
  private async applyReentry(
    existing: Lead,
    input: CapturedLeadInput,
    touch: any,
    ctx: IngestContext,
    match: DuplicateMatch,
  ): Promise<Lead> {
    const lead = (await this.leadRepo.findOne({ where: { id: existing.id } }))!;
    const fillable: (keyof CapturedLeadInput & keyof Lead)[] = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'country',
      'state',
      'city',
      'dateOfBirth',
      'studentId',
      'courseId',
      'programInterest',
      'intake',
      'intakeSessionId',
      'testType',
      'testScore',
      'gpa',
      'workExperienceYears',
      'formName',
      'branchId',
    ];
    const filled: string[] = [];
    for (const key of fillable) {
      const v = (input as any)[key];
      if ((lead as any)[key] === null || (lead as any)[key] === undefined || (lead as any)[key] === '') {
        if (v !== null && v !== undefined && v !== '') {
          (lead as any)[key] = v;
          filled.push(key);
        }
      }
    }
    lead.lastTouch = touch;
    lead.touchCount = (lead.touchCount || 1) + 1;
    lead.duplicateCount = (lead.duplicateCount || 0) + 1;
    this.scoring.applyEngagement(lead, 'form_submission');
    for (const [k, v] of Object.entries(input.engagement || {})) {
      lead.engagement = { ...(lead.engagement || {}), [k]: (lead.engagement?.[k] || 0) + Number(v || 0) };
    }
    lead.rawPayload = {
      ...(lead.rawPayload || {}),
      reentries: [
        ...(((lead.rawPayload || {}).reentries as any[]) || []).slice(-19),
        { at: touch.at, createdFrom: ctx.createdFrom, channelSource: input.channelSource, payload: input.rawPayload ?? null },
      ],
    };
    await this.scoring.applyScore(lead);
    const saved = await this.leadRepo.save(lead);

    await this.activityRepo.save(
      this.activityRepo.create({
        leadId: saved.id,
        organizationId: saved.organizationId,
        actorId: ctx.actorId ?? undefined,
        action: 'reentry',
        content:
          `Same lead submitted again via ${input.channelSource || ctx.createdFrom} (${match.reasons.join(', ')}) — no new record created` +
          (filled.length ? `; filled: ${filled.join(', ')}` : ''),
        metadata: { touch, confidence: match.confidence, reasons: match.reasons },
      }),
    );
    if (saved.assignedTo) {
      await this.notifications.notify({
        organizationId: saved.organizationId,
        recipientUserId: saved.assignedTo,
        module: 'leads',
        type: 'lead_reentry',
        severity: 'info',
        title: 'Lead re-engaged',
        body: `${this.name(saved)} submitted again via ${input.channelSource || ctx.createdFrom}.`,
        link: LEAD_LINK(saved.id),
        relatedEntityId: saved.id,
      });
    }
    return saved;
  }

  name(lead: Lead) {
    return `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.email || lead.phone || 'A lead';
  }

  /** Writes assignment history + notifies the assignee. */
  async logAssignment(
    lead: Lead,
    previousAssignedTo: string | null,
    result: AssignmentResult,
    actorId: string | null,
    action: 'auto_assigned' | 'assigned' | 'reassigned',
    reason?: string | null,
  ) {
    await this.activityRepo.save(
      this.activityRepo.create({
        leadId: lead.id,
        organizationId: lead.organizationId,
        actorId: actorId ?? undefined,
        action,
        content: reason ? `${result.ruleText} — ${reason}` : result.ruleText,
        previousAssignedTo: previousAssignedTo ?? undefined,
        newAssignedTo: result.userId,
        metadata: { rule: result.ruleText, ruleId: result.ruleId ?? null },
      }),
    );
    if (result.userId && result.userId !== actorId) {
      await this.notifications.notify({
        organizationId: lead.organizationId,
        recipientUserId: result.userId,
        module: 'leads',
        type: 'lead_assigned',
        severity: lead.scoreBand === 'hot' ? 'warning' : 'info',
        title: lead.scoreBand === 'hot' ? 'Hot lead assigned to you' : 'New lead assigned to you',
        body: `${this.name(lead)}${lead.programInterest ? ` · ${lead.programInterest}` : ''} — ${result.ruleText}`,
        link: LEAD_LINK(lead.id),
        relatedEntityId: lead.id,
        metadata: { score: lead.score, scoreBand: lead.scoreBand },
      });
    }
  }
}
