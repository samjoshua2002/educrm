import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FOLLOW_UP_STATUSES, Lead, LeadStatus } from './entities/lead.entity.js';
import { LeadQueryDto } from './dto/lead-query.dto.js';
import { LeadActivity } from './entities/lead-activity.entity.js';
import { VerifyLeadDto } from './dto/verify-lead.dto.js';
import { AssignLeadDto } from './dto/assign-lead.dto.js';
import { AddLeadNoteDto } from './dto/add-lead-note.dto.js';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto.js';
import { CloseLeadDto } from './dto/close-lead.dto.js';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../../common/enums/roles.enum.js';
import { LeadAssignmentService } from './lead-assignment.service.js';
import { MailerService } from '../notifications/mailer.service.js';
import { LeadPipelineService } from './lead-pipeline.service.js';
import { EngagementType, LeadScoringService } from './lead-scoring.service.js';
import { CapturedLeadInput } from './lead-field-mapper.js';
import { LeadSourceTrackingService } from './lead-source-tracking.service.js';

/** Fields whose change should trigger a rescore */
const SCORING_FIELDS = [
  'testScore',
  'testType',
  'gpa',
  'workExperienceYears',
  'courseId',
  'programInterest',
  'intake',
  'intakeSessionId',
  'country',
  'state',
  'city',
  'email',
  'phone',
  'channelSource',
  'sourceType',
];

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private readonly leadActivityRepository: Repository<LeadActivity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly assignmentService: LeadAssignmentService,
    private readonly mailerService: MailerService,
    private readonly pipeline: LeadPipelineService,
    private readonly scoring: LeadScoringService,
    private readonly sourceTracking: LeadSourceTrackingService,
  ) {}

  /** Manual creation by staff: same pipeline as captured leads (source tracking, scoring, routing, duplicate flag). */
  async create(orgId: string, dto: any, actorId?: string) {
    const { scoreBand: _ignored, assignmentReason: _r, ...rest } = dto || {};
    if (rest.assignedTo) await this.assertAssignable(orgId, rest.assignedTo);
    const input: CapturedLeadInput = {
      ...rest,
      rawPayload: rest.rawPayload || {},
    };
    const result = await this.pipeline.ingest(orgId, input, {
      createdFrom: rest.createdFrom || 'Manual',
      channelSource: rest.channelSource || null,
      mode: 'manual',
      actorId: actorId ?? null,
      note: 'entered by staff',
    });
    return { ...result.lead, duplicateCheck: result.match ?? null, outcome: result.outcome };
  }

  async update(id: string, orgId: string, actorId: string, dto: any, role?: Role): Promise<Lead> {
    const lead = await this.findOne(id, orgId, actorId, role);
    const { scoreBand: _ignored, assignmentReason, assignedTo, ...rest } = dto || {};

    if (rest.followUpStatus && !(FOLLOW_UP_STATUSES as readonly string[]).includes(rest.followUpStatus)) {
      throw new BadRequestException(`Follow-up status must be one of ${FOLLOW_UP_STATUSES.join(', ')}`);
    }
    if (rest.status !== undefined && rest.status !== lead.status) this.assertSettableStatus(rest.status);
    if (rest.branchId) {
      await this.pipeline.resolveBranch(orgId, rest);
      if (!rest.branchId) throw new BadRequestException('Branch not found in this organization');
    }

    const changedScoring = SCORING_FIELDS.some(
      (k) => rest[k] !== undefined && String(rest[k] ?? '') !== String((lead as any)[k] ?? ''),
    );
    const sourceChanged = ['utmSource', 'utmMedium', 'utmCampaign', 'campaignId', 'campaignName'].some(
      (k) => rest[k] !== undefined && String(rest[k] ?? '') !== String((lead as any)[k] ?? ''),
    );

    if (rest.nextFollowUpAt) rest.nextFollowUpAt = new Date(rest.nextFollowUpAt);
    if (rest.email) rest.email = String(rest.email).trim().toLowerCase();
    Object.assign(lead, rest);

    if (rest.courseId !== undefined || rest.programInterest !== undefined || rest.intake !== undefined || rest.intakeSessionId !== undefined) {
      const resolved: CapturedLeadInput = {
        courseId: lead.courseId,
        programInterest: rest.courseId !== undefined && rest.programInterest === undefined ? null : lead.programInterest,
        intake: rest.intakeSessionId !== undefined && rest.intake === undefined ? null : lead.intake,
        intakeSessionId: lead.intakeSessionId,
      };
      await this.pipeline.resolveProgramAndIntake(orgId, resolved);
      lead.courseId = resolved.courseId as any;
      lead.programInterest = resolved.programInterest ?? null;
      lead.intake = resolved.intake ?? null;
      lead.intakeSessionId = resolved.intakeSessionId ?? null;
    }

    if (sourceChanged) {
      // re-map campaign (utm_campaign → MarketingCampaign) for manual corrections
      const input: CapturedLeadInput = {
        utmSource: lead.utmSource,
        utmMedium: lead.utmMedium,
        utmCampaign: lead.utmCampaign,
        campaignId: rest.campaignId !== undefined ? rest.campaignId : lead.campaignId,
        campaignName: lead.campaignName,
        subSource: lead.subSource,
        sourceType: lead.sourceType,
        channelSource: lead.channelSource,
        submissionUrl: lead.submissionUrl,
        referrerUrl: lead.referrerUrl,
        source: lead.source,
      };
      await this.sourceTracking.apply(orgId, input, { createdFrom: lead.createdFrom || 'Manual' });
      lead.campaignId = input.campaignId as any;
      lead.campaignName = input.campaignName ?? null;
      lead.subSource = input.subSource ?? null;
      lead.sourceType = input.sourceType ?? null;
    }

    if (changedScoring || sourceChanged || !lead.lastScoredAt) {
      await this.scoring.applyScore(lead);
    }

    // assignment changes through the edit form keep history
    const previousAssignedTo = lead.assignedTo ?? null;
    let reassigned = false;
    if (assignedTo !== undefined && (assignedTo || null) !== previousAssignedTo) {
      if (role === Role.LEAD_MANAGER || role === Role.COUNSELOR) {
        // these roles reassign through the dedicated endpoint only
      } else if (assignedTo) {
        await this.assertAssignable(orgId, assignedTo);
        lead.assignedTo = assignedTo;
        lead.assignedAt = new Date();
        lead.assignmentRule = await this.manualRuleText(actorId, assignmentReason);
        reassigned = true;
      } else {
        lead.assignedTo = null as any;
        lead.assignmentRule = null;
      }
    }

    delete (lead as any).assignedToUser;
    const updated = await this.leadRepository.save(lead);

    await this.logActivity({
      leadId: updated.id,
      organizationId: updated.organizationId,
      actorId,
      action: 'updated',
      content: 'Lead updated manually' + (changedScoring ? ` — rescored to ${updated.score} (${updated.scoreBand})` : ''),
      newStatus: updated.status,
    });
    if (reassigned) {
      await this.pipeline.logAssignment(
        updated,
        previousAssignedTo,
        { userId: updated.assignedTo, timestamp: updated.assignedAt, ruleText: updated.assignmentRule || 'Manual reassignment' },
        actorId,
        'reassigned',
      );
    }
    return this.findOne(id, orgId, actorId, role);
  }

  private async manualRuleText(actorId: string, reason?: string | null) {
    const actor = actorId ? await this.userRepository.findOne({ where: { id: actorId } }) : null;
    return `Manual reassignment${actor ? ` by ${actor.name}` : ''}${reason ? `: ${reason}` : ''}`;
  }

  /** A real lead status; "merged" is only set by the duplicate merge. */
  private assertSettableStatus(status: any) {
    const allowed = (Object.values(LeadStatus) as string[]).filter((s) => s !== LeadStatus.MERGED);
    if (typeof status !== 'string' || !allowed.includes(status)) {
      throw new BadRequestException(`Status must be one of ${allowed.join(', ')}`);
    }
  }

  private async assertAssignable(orgId: string, userId: string) {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        organizationId: orgId,
        isActive: true,
        role: In([Role.COUNSELOR, Role.LEAD_MANAGER, Role.ORG_ADMIN]),
      },
    });
    if (!user) {
      throw new BadRequestException('Assigned user must be an active counselor, lead manager or admin in this organization');
    }
    return user;
  }

  async findAll(orgId: string, queryDto: LeadQueryDto, userId?: string, role?: Role) {
    const query = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoin('lead.assignedToUser', 'assignedToUser')
      .addSelect(['assignedToUser.id', 'assignedToUser.name', 'assignedToUser.role'])
      .where('lead.organization_id = :orgId', { orgId });

    if (queryDto.status) {
      query.andWhere('lead.status = :status', { status: queryDto.status });
    } else if (queryDto.includeMerged !== 'true') {
      query.andWhere('lead.status != :merged', { merged: LeadStatus.MERGED });
    }

    if (queryDto.search) {
      query.andWhere(
        '(lead.first_name ILIKE :search OR lead.last_name ILIKE :search OR lead.email ILIKE :search OR lead.phone ILIKE :search OR lead.student_id ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    // Counselors can only ever see their own assigned leads — enforced server-side.
    if (role === Role.COUNSELOR) {
      query.andWhere('lead.assigned_to = :assignedTo', { assignedTo: userId });
    } else if (queryDto.assignedTo) {
      if (queryDto.assignedTo === 'unassigned') {
        query.andWhere('lead.assigned_to IS NULL');
      } else {
        const assignedValue = queryDto.assignedTo === 'me' ? userId : queryDto.assignedTo;
        if (assignedValue) query.andWhere('lead.assigned_to = :assignedTo', { assignedTo: assignedValue });
      }
    }

    if (queryDto.followUpDate) {
      query.andWhere('DATE(lead.next_follow_up_at) = :followUpDate', { followUpDate: queryDto.followUpDate });
    }
    if (queryDto.scoreBand) query.andWhere('lead.score_band = :scoreBand', { scoreBand: queryDto.scoreBand });
    if (queryDto.state) query.andWhere('lead.state = :state', { state: queryDto.state });
    if (queryDto.city) query.andWhere('lead.city = :city', { city: queryDto.city });
    if (queryDto.channelSource) query.andWhere('lead.channel_source = :cs', { cs: queryDto.channelSource });
    if (queryDto.sourceType) query.andWhere('lead.source_type = :st', { st: queryDto.sourceType });
    if (queryDto.createdFrom) query.andWhere('lead.created_from = :cf', { cf: queryDto.createdFrom });
    if (queryDto.followUpStatus) query.andWhere('lead.follow_up_status = :fus', { fus: queryDto.followUpStatus });
    if (queryDto.campaignId) query.andWhere('lead.campaign_id = :cid', { cid: queryDto.campaignId });
    if (queryDto.duplicates === 'true') query.andWhere('lead.is_duplicate = true AND lead.master_lead_id IS NOT NULL');

    if (queryDto.source) {
      if (queryDto.source.toLowerCase() === 'other') {
        const standardList = ['website', 'instagram', 'linkedin', 'facebook', 'x (twitter)', 'twitter', 'whatsapp', 'youtube', 'google ads', 'direct', 'referral'];
        query.andWhere(
          '(lead.source ILIKE :other OR LOWER(lead.source) NOT IN (:...standardList) OR lead.source IS NULL)',
          { other: '%other%', standardList },
        );
      } else {
        query.andWhere(
          '(lead.source ILIKE :source OR lead.utm_source ILIKE :source OR lead.sub_source ILIKE :source)',
          { source: `%${queryDto.source}%` },
        );
      }
    }

    if (queryDto.campaign) {
      query.andWhere(
        '(lead.utm_campaign ILIKE :campaign OR lead.campaign_name ILIKE :campaign OR lead.campaign_id::text ILIKE :campaign)',
        { campaign: `%${queryDto.campaign}%` },
      );
    }

    if (queryDto.stage) {
      query.andWhere("lead.raw_payload->>'stage' = :stage", { stage: queryDto.stage });
    }

    const sortDirection = (queryDto.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    if (queryDto.sortBy === 'score') {
      query.orderBy('lead.score', sortDirection, 'NULLS LAST').addOrderBy('lead.createdAt', 'DESC');
    } else {
      query.orderBy('lead.createdAt', sortDirection);
    }

    const [data, total] = await query.skip(queryDto.skip).take(queryDto.limit).getManyAndCount();
    const totalPages = Math.ceil(total / queryDto.limit);
    return { data, total, totalPages, page: queryDto.page, limit: queryDto.limit };
  }

  async findOne(id: string, orgId: string, userId?: string, role?: Role): Promise<Lead> {
    const lead = await this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.branch', 'branch')
      .leftJoinAndSelect('lead.form', 'form')
      .leftJoinAndSelect('lead.course', 'course')
      .leftJoin('lead.assignedToUser', 'assignedToUser')
      .addSelect(['assignedToUser.id', 'assignedToUser.name', 'assignedToUser.role', 'assignedToUser.email'])
      .where('lead.id = :id AND lead.organization_id = :orgId', { id, orgId })
      .getOne();
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    if (role === Role.COUNSELOR && lead.assignedTo !== userId) {
      throw new ForbiddenException('You can only view leads assigned to you');
    }
    return lead;
  }

  /** Full timeline incl. assignment history, merges and activities moved from merged duplicates. */
  async getActivities(id: string, orgId: string, userId?: string, role?: Role) {
    await this.findOne(id, orgId, userId, role);
    const rows = await this.leadActivityRepository.find({
      where: { leadId: id, organizationId: orgId },
      order: { createdAt: 'DESC' },
      take: 500,
    });
    const userIds = Array.from(
      new Set(rows.flatMap((r) => [r.actorId, r.previousAssignedTo, r.newAssignedTo]).filter(Boolean)),
    ) as string[];
    const users = userIds.length ? await this.userRepository.find({ where: { id: In(userIds) } }) : [];
    const names = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r) => ({
      ...r,
      actorName: r.actorId ? names.get(r.actorId) ?? null : null,
      previousAssignedToName: r.previousAssignedTo ? names.get(r.previousAssignedTo) ?? null : null,
      newAssignedToName: r.newAssignedTo ? names.get(r.newAssignedTo) ?? null : null,
    }));
  }

  async updateStatus(id: string, orgId: string, status: string, actorId?: string): Promise<Lead> {
    this.assertSettableStatus(status);
    const lead = await this.findOne(id, orgId);
    const previousStatus = lead.status;
    lead.status = status as LeadStatus;

    let assignmentNote = '';
    if (status === LeadStatus.VERIFIED) {
      lead.verifiedBy = actorId || lead.verifiedBy;
      lead.verifiedAt = new Date();
      await this.processStudentVerification(lead);
      assignmentNote = await this.handoffToCounselor(lead, actorId ?? null);
    } else if (status === LeadStatus.DISQUALIFIED) {
      lead.rawPayload = { ...(lead.rawPayload || {}), stage: 'Lost' };
    }

    delete (lead as any).assignedToUser;
    const updated = await this.leadRepository.save(lead);
    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'status_changed',
      content: `Status changed from ${previousStatus} to ${status}${assignmentNote}`,
      previousStatus,
      newStatus: status,
    });
    return updated;
  }

  /**
   * After verification the lead moves to a counselor. If routing already placed it
   * with a counselor, it stays; otherwise the routing rules run with the counselor pool as fallback.
   */
  private async handoffToCounselor(lead: Lead, actorId: string | null): Promise<string> {
    if (lead.assignedTo) {
      const current = await this.userRepository.findOne({ where: { id: lead.assignedTo } });
      if (current?.role === Role.COUNSELOR && current.isActive) return '';
    }
    const assignment = await this.assignmentService.route(lead, Role.COUNSELOR);
    if (!assignment || assignment.userId === lead.assignedTo) return '';
    const previous = lead.assignedTo ?? null;
    lead.assignedTo = assignment.userId;
    lead.assignedAt = assignment.timestamp;
    lead.assignmentRule = assignment.ruleText;
    await this.pipeline.logAssignment(lead, previous, assignment, actorId, 'auto_assigned');
    return ' and reassigned to a counselor';
  }

  async verify(id: string, orgId: string, actorId: string, dto: VerifyLeadDto): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    if (![LeadStatus.UNVERIFIED].includes(lead.status)) {
      throw new BadRequestException('Only unverified leads can be verified');
    }

    const nextStatus = dto.action === 'qualify' ? LeadStatus.VERIFIED : LeadStatus.DISQUALIFIED;
    const previousStatus = lead.status;
    lead.status = nextStatus;
    lead.verifiedBy = actorId;
    lead.verifiedAt = new Date();

    let assignmentNote = '';
    if (nextStatus === LeadStatus.VERIFIED) {
      await this.processStudentVerification(lead);
      assignmentNote = await this.handoffToCounselor(lead, actorId);
    } else if (nextStatus === LeadStatus.DISQUALIFIED) {
      lead.rawPayload = { ...(lead.rawPayload || {}), stage: 'Lost' };
    }

    delete (lead as any).assignedToUser;
    const updated = await this.leadRepository.save(lead);
    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'verified',
      content: `${dto.reason || `Lead ${dto.action}d`}${assignmentNote}`,
      previousStatus,
      newStatus: nextStatus,
    });
    return updated;
  }

  private async processStudentVerification(lead: Lead): Promise<void> {
    lead.rawPayload = { ...(lead.rawPayload || {}), stage: 'Verified' };
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const studentEmail = lead.email;
    const studentName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || studentEmail || 'Student';

    if (studentEmail) {
      let user = await this.userRepository.findOne({ where: { email: studentEmail } });
      if (!user) {
        user = this.userRepository.create({
          name: studentName,
          email: studentEmail,
          phone: lead.phone || undefined,
          role: Role.STUDENT,
          organizationId: lead.organizationId,
          oneTimePassword: otp,
          isActive: true,
        });
      } else if (user.role !== Role.STUDENT) {
        // The email belongs to a staff / admin account (possibly of another organization):
        // never overwrite that account's one-time password from a lead.
        return;
      } else {
        user.oneTimePassword = otp;
      }
      await this.userRepository.save(user);

      await this.mailerService.sendStudentVerificationOtpEmail(studentEmail, studentName, otp);
    }
  }

  /** Manual (re)assignment — keeps history in lead_activities and notifies the new owner. */
  async assign(id: string, orgId: string, actorId: string, dto: AssignLeadDto): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    await this.assertAssignable(orgId, dto.assignedTo);

    const previousAssignedTo = lead.assignedTo ?? null;
    lead.assignedTo = dto.assignedTo;
    lead.assignedAt = new Date();
    lead.assignmentRule = await this.manualRuleText(actorId, dto.reason);
    delete (lead as any).assignedToUser;
    const updated = await this.leadRepository.save(lead);

    await this.pipeline.logAssignment(
      updated,
      previousAssignedTo,
      { userId: dto.assignedTo, timestamp: updated.assignedAt, ruleText: updated.assignmentRule! },
      actorId,
      previousAssignedTo ? 'reassigned' : 'assigned',
    );
    return this.findOne(id, orgId);
  }

  /** Re-runs the routing rules for a lead (e.g. after the rules changed). */
  async reroute(id: string, orgId: string, actorId: string): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    const result = await this.assignmentService.route(lead);
    if (!result) throw new BadRequestException('No routing rule or default pool produced an assignee');
    const previous = lead.assignedTo ?? null;
    lead.assignedTo = result.userId;
    lead.assignedAt = result.timestamp;
    lead.assignmentRule = result.ruleText;
    delete (lead as any).assignedToUser;
    const saved = await this.leadRepository.save(lead);
    await this.pipeline.logAssignment(saved, previous, result, actorId, previous ? 'reassigned' : 'auto_assigned');
    return this.findOne(id, orgId);
  }

  async addNote(id: string, orgId: string, actorId: string, dto: AddLeadNoteDto, role?: Role): Promise<Lead> {
    const lead = await this.findOne(id, orgId, actorId, role);
    if (dto.nextFollowUpAt) {
      lead.nextFollowUpAt = new Date(dto.nextFollowUpAt);
    }
    if (lead.status === LeadStatus.VERIFIED) {
      lead.status = LeadStatus.WORKING;
    }
    // Scope step 7: counselor follows up and updates status
    lead.followUpStatus =
      lead.nextFollowUpAt && lead.nextFollowUpAt.getTime() > Date.now() ? 'Scheduled' : 'Contacted';

    delete (lead as any).assignedToUser;
    const updated = await this.leadRepository.save(lead);
    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'note_added',
      content: dto.content,
      disposition: dto.disposition,
      newStatus: updated.status,
      metadata: { followUpStatus: updated.followUpStatus },
    });
    return updated;
  }

  async updateFollowUpStatus(
    id: string,
    orgId: string,
    actorId: string,
    followUpStatus: string,
    nextFollowUpAt?: string,
    role?: Role,
  ): Promise<Lead> {
    const lead = await this.findOne(id, orgId, actorId, role);
    const previous = lead.followUpStatus;
    lead.followUpStatus = followUpStatus;
    if (nextFollowUpAt) lead.nextFollowUpAt = new Date(nextFollowUpAt);
    if (followUpStatus === 'Scheduled' && !lead.nextFollowUpAt) {
      throw new BadRequestException('Set the next follow-up date to mark the lead as Scheduled');
    }
    delete (lead as any).assignedToUser;
    const updated = await this.leadRepository.save(lead);
    await this.logActivity({
      leadId: id,
      organizationId: orgId,
      actorId,
      action: 'follow_up_status',
      content: `Follow-up status changed from ${previous || 'Pending'} to ${followUpStatus}`,
      metadata: { nextFollowUpAt: updated.nextFollowUpAt },
    });
    return updated;
  }

  async updateLeadStatus(id: string, orgId: string, actorId: string, dto: UpdateLeadStatusDto, role?: Role): Promise<Lead> {
    this.assertSettableStatus(dto.status);
    const lead = await this.findOne(id, orgId, actorId, role);
    const previousStatus = lead.status;
    lead.status = dto.status as LeadStatus;
    if (dto.status === LeadStatus.DISQUALIFIED) {
      lead.rawPayload = { ...(lead.rawPayload || {}), stage: 'Lost' };
    }
    delete (lead as any).assignedToUser;
    const updated = await this.leadRepository.save(lead);

    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'status_changed',
      content: dto.reason || `Status changed from ${previousStatus} to ${dto.status}`,
      previousStatus,
      newStatus: dto.status,
    });
    return updated;
  }

  async close(id: string, orgId: string, actorId: string, dto: CloseLeadDto, role?: Role): Promise<Lead> {
    const lead = await this.findOne(id, orgId, actorId, role);
    const previousStatus = lead.status;
    lead.status = LeadStatus.CLOSED;
    lead.closureReason = dto.reason as any;
    lead.closureNotes = dto.notes || null;
    delete (lead as any).assignedToUser;
    const updated = await this.leadRepository.save(lead);

    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'closed',
      content: dto.notes || dto.reason,
      previousStatus,
      newStatus: LeadStatus.CLOSED,
    });
    return updated;
  }

  /** Engagement event (email open/reply, webinar, event attendance, bounce…) → rescore. */
  async recordEngagement(
    id: string,
    orgId: string,
    type: EngagementType,
    opts: { count?: number; note?: string; actorId?: string | null; userId?: string; role?: Role } = {},
  ): Promise<Lead> {
    const lead = opts.role ? await this.findOne(id, orgId, opts.userId, opts.role) : await this.findOne(id, orgId);
    const before = lead.score;
    this.scoring.applyEngagement(lead, type, opts.count ?? 1);
    await this.scoring.applyScore(lead);
    delete (lead as any).assignedToUser;
    const saved = await this.leadRepository.save(lead);
    await this.logActivity({
      leadId: id,
      organizationId: orgId,
      actorId: opts.actorId ?? undefined,
      action: 'engagement',
      content: `${type.replace(/_/g, ' ')}${opts.note ? ` — ${opts.note}` : ''} (score ${before ?? 0} → ${saved.score})`,
      metadata: { type, count: opts.count ?? 1 },
    });
    return saved;
  }

  async rescore(id: string, orgId: string): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    return this.scoring.scoreAndSave(lead);
  }

  async remove(id: string, orgId: string): Promise<void> {
    const lead = await this.findOne(id, orgId);
    delete (lead as any).assignedToUser;
    await this.leadRepository.remove(lead);
  }

  private async logActivity(payload: Partial<LeadActivity>): Promise<void> {
    const activity = this.leadActivityRepository.create(payload);
    await this.leadActivityRepository.save(activity);
  }
}
