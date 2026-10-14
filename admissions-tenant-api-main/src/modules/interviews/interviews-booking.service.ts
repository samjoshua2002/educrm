import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Interview } from './entities/interview.entity.js';
import { InterviewSlot } from './entities/interview-slot.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { BookInterviewDto } from './dto/book-interview.dto.js';
import { RescheduleInterviewDto } from './dto/reschedule-interview.dto.js';
import { CompleteInterviewDto } from './dto/complete-interview.dto.js';
import { CreateInterviewDto, UpdateInterviewDto } from './dto/interview.dto.js';
import { ScoringService } from './scoring.service.js';
import { MailerService } from '../notifications/mailer.service.js';
import { EmailTemplatesService } from '../email-templates/email-templates.service.js';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service.js';
import { CalendarSyncService } from '../calendar-sync/calendar-sync.service.js';

@Injectable()
export class InterviewsBookingService {
  private readonly logger = new Logger(InterviewsBookingService.name);

  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(InterviewSlot)
    private readonly slotRepository: Repository<InterviewSlot>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly dataSource: DataSource,
    private readonly scoringService: ScoringService,
    private readonly mailerService: MailerService,
    private readonly emailTemplatesService: EmailTemplatesService,
    private readonly inAppNotifications: InAppNotificationsService,
    private readonly calendarSync: CalendarSyncService,
  ) {}

  // Emails the candidate about an interview status change. Never throws —
  // the mailer swallows its own errors and we void the call so a slow SMTP
  // server can't hold up (or fail) the interview action itself.
  private async notifyInterviewStatus(
    orgId: string,
    interview: Interview,
    event: 'Scheduled' | 'Rescheduled' | 'Cancelled' | 'No Show' | 'Completed',
  ): Promise<void> {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id: interview.applicationId, organizationId: orgId },
      });
      if (!application?.email) return;
      const slot = interview.slotId
        ? await this.slotRepository.findOne({ where: { id: interview.slotId, organizationId: orgId } })
        : null;
      await this.mailerService.sendInterviewStatusEmail(application, interview, slot, event);
    } catch {
      // best-effort only
    }
  }

  // Evaluator portal: tell each panel member (in-app) that they have an
  // interview to evaluate. Only the given user ids are notified, so callers
  // pass just the newly added panel members on edits.
  private async notifyPanel(
    orgId: string,
    interview: Interview,
    userIds: string[],
    kind: 'assigned' | 'rescheduled' | 'cancelled',
  ): Promise<void> {
    if (!userIds.length) return;
    try {
      const application = await this.applicationRepository.findOne({ where: { id: interview.applicationId } });
      const when = interview.startTime
        ? new Date(interview.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
        : 'time to be confirmed';
      const typeLabel = interview.interviewType === 'GD' ? 'Group Discussion' : 'Personal Interview';
      const candidate = `${application?.name ?? 'Candidate'}${application?.applicationNo ? ` (${application.applicationNo})` : ''}`;
      const title =
        kind === 'assigned'
          ? `You are on the panel: ${typeLabel} - ${candidate}`
          : kind === 'rescheduled'
            ? `Interview rescheduled: ${typeLabel} - ${candidate}`
            : `Interview cancelled: ${typeLabel} - ${candidate}`;
      const body =
        kind === 'cancelled'
          ? `The ${typeLabel} (round ${interview.round}) has been cancelled.`
          : `${typeLabel}, round ${interview.round}, on ${when}${interview.location ? ` at ${interview.location}` : ''}${interview.meetingLink ? `. Meeting link: ${interview.meetingLink}` : ''}. Open the Evaluator Portal to enter your feedback.`;
      for (const userId of userIds) {
        await this.inAppNotifications.notify({
          organizationId: orgId,
          recipientUserId: userId,
          module: 'interviews',
          type: `interview_panel_${kind}`,
          severity: kind === 'cancelled' ? 'warning' : 'info',
          title,
          body,
          link: `/organization/gd-interview/evaluate/${interview.id}`,
          relatedEntityId: interview.id,
          metadata: { interviewId: interview.id, applicationId: interview.applicationId, interviewType: interview.interviewType },
        });
      }
    } catch (err) {
      this.logger.warn(`Panel notification failed: ${(err as Error).message}`);
    }
  }

  // Calendar sync is best-effort and runs after the response is sent; a
  // missing / failing calendar connection never blocks the interview action.
  private queueCalendarSync(orgId: string, interviewId: string, action: 'upsert' | 'delete') {
    void this.calendarSync.syncInterview(orgId, interviewId, action).catch(() => undefined);
  }

  // Copies the slot's schedule onto the interview's own scope fields
  // (Interview_Date, Start_Time, End_Time, Interview_Mode, Location,
  // Meeting_Link).
  private applySlot(interview: Interview, slot: InterviewSlot) {
    interview.slotId = slot.id;
    interview.interviewDate = slot.slotDate;
    interview.startTime = slot.startTime;
    interview.endTime = slot.endTime;
    interview.interviewMode = slot.mode || interview.interviewMode;
    interview.location = slot.location || interview.location;
    if (slot.meetingLink) interview.meetingLink = slot.meetingLink;
  }

  private async bookSlot(manager: EntityManager, slot: InterviewSlot, interviewId: string, actorId: string) {
    slot.status = 'Booked';
    slot.interviewId = interviewId;
    slot.candidateBooked = true;
    slot.bookingTime = new Date();
    slot.updatedBy = actorId;
    await manager.save(slot);
  }

  private async releaseSlot(manager: EntityManager, slot: InterviewSlot, actorId: string) {
    slot.status = 'Available';
    slot.interviewId = null;
    slot.candidateBooked = false;
    slot.bookingTime = null;
    slot.updatedBy = actorId;
    await manager.save(slot);
  }

  // Creates an interview without a slot yet (Interview_Status "Slot
  // Available"): the candidate is to be booked into a slot later.
  async create(orgId: string, dto: CreateInterviewDto, actorId: string) {
    const application = await this.applicationRepository.findOne({ where: { id: dto.applicationId, organizationId: orgId } });
    if (!application) throw new NotFoundException(`Application #${dto.applicationId} not found`);
    const existingRounds = await this.interviewRepository.count({
      where: { applicationId: application.id, interviewType: dto.interviewType },
    });
    const interview = this.interviewRepository.create({
      organizationId: orgId,
      applicationId: application.id,
      interviewType: dto.interviewType,
      interviewMode: dto.interviewMode ?? null,
      round: dto.round ?? existingRounds + 1,
      status: 'Slot Available',
      assignedPanel: Array.from(new Set(dto.assignedPanel ?? [])),
      interviewDate: dto.interviewDate ?? null,
      startTime: dto.startTime ? new Date(dto.startTime) : null,
      endTime: dto.endTime ? new Date(dto.endTime) : null,
      meetingLink: dto.meetingLink ?? null,
      location: dto.location ?? null,
      createdBy: actorId,
      updatedBy: actorId,
    } as Partial<Interview>);
    const saved = await this.interviewRepository.save(interview);
    void this.notifyPanel(orgId, saved, saved.assignedPanel ?? [], 'assigned');
    return this.findOneOrThrow(saved.id, orgId);
  }

  // Edits the interview's own fields (mode, panel, link, location, outcome,
  // round, times). Scheduling into a slot still goes through book/reschedule.
  async update(orgId: string, id: string, dto: UpdateInterviewDto, actorId: string) {
    const interview = await this.interviewRepository.findOne({ where: { id, organizationId: orgId } });
    if (!interview) throw new NotFoundException(`Interview #${id} not found`);
    const previousPanel = new Set(interview.assignedPanel ?? []);
    const before = {
      start: interview.startTime ? new Date(interview.startTime).getTime() : null,
      end: interview.endTime ? new Date(interview.endTime).getTime() : null,
      link: interview.meetingLink,
      location: interview.location,
      mode: interview.interviewMode,
    };

    if (dto.interviewMode !== undefined) interview.interviewMode = dto.interviewMode;
    if (dto.round !== undefined) interview.round = dto.round;
    if (dto.interviewDate !== undefined) interview.interviewDate = dto.interviewDate;
    if (dto.startTime !== undefined) interview.startTime = dto.startTime ? new Date(dto.startTime) : (null as any);
    if (dto.endTime !== undefined) interview.endTime = dto.endTime ? new Date(dto.endTime) : (null as any);
    if (dto.meetingLink !== undefined) interview.meetingLink = dto.meetingLink;
    if (dto.location !== undefined) interview.location = dto.location;
    if (dto.outcome !== undefined) interview.outcome = dto.outcome;
    if (dto.assignedPanel !== undefined) interview.assignedPanel = Array.from(new Set(dto.assignedPanel));
    if (dto.status !== undefined) {
      if (['Scheduled', 'Rescheduled'].includes(dto.status) && !interview.slotId && !interview.startTime) {
        throw new BadRequestException('Book a slot (or set a start time) before marking the interview Scheduled.');
      }
      interview.status = dto.status;
    }
    if (interview.startTime && interview.endTime && new Date(interview.endTime) <= new Date(interview.startTime)) {
      throw new BadRequestException('End time must be after start time.');
    }
    interview.updatedBy = actorId;
    const saved = await this.interviewRepository.save(interview);

    const added = (saved.assignedPanel ?? []).filter((u) => !previousPanel.has(u));
    void this.notifyPanel(orgId, saved, added, 'assigned');

    const changed =
      added.length > 0 ||
      (saved.assignedPanel ?? []).length !== previousPanel.size ||
      before.start !== (saved.startTime ? new Date(saved.startTime).getTime() : null) ||
      before.end !== (saved.endTime ? new Date(saved.endTime).getTime() : null) ||
      before.link !== saved.meetingLink ||
      before.location !== saved.location ||
      before.mode !== saved.interviewMode;
    if (saved.status === 'Cancelled') this.queueCalendarSync(orgId, saved.id, 'delete');
    else if (changed && ['Scheduled', 'Rescheduled'].includes(saved.status)) this.queueCalendarSync(orgId, saved.id, 'upsert');

    return this.findOneOrThrow(saved.id, orgId);
  }

  // Books a shortlisted Application into an Available slot: creates the
  // Interview (or fills an existing "Slot Available" one), marks the slot
  // Booked, and mirrors the date/time/location onto Application's flat
  // columns (what the GD-Interview list page reads).
  async book(orgId: string, dto: BookInterviewDto, actorId: string) {
    const interview = await this.dataSource.transaction(async (manager) => {
      const application = await manager.findOne(Application, {
        where: { id: dto.applicationId, organizationId: orgId },
      });
      if (!application) {
        throw new NotFoundException(`Application #${dto.applicationId} not found`);
      }
      if (!['Shortlisted', 'Eligible', 'Review', 'Not Eligible'].includes(application.shortlistStatus)) {
        throw new BadRequestException('Only shortlisted or review applications can be scheduled for interview.');
      }

      const slot = await manager.findOne(InterviewSlot, { where: { id: dto.slotId, organizationId: orgId } });
      if (!slot) {
        throw new NotFoundException(`Interview slot #${dto.slotId} not found`);
      }
      if (slot.status !== 'Available') {
        throw new BadRequestException(`Slot is not available (current status: ${slot.status}).`);
      }
      if (slot.interviewType !== dto.interviewType) {
        throw new BadRequestException(`Slot is a ${slot.interviewType} slot, cannot book a ${dto.interviewType} interview into it.`);
      }

      // Panel defaults to the slot's assigned interviewer; any explicitly
      // passed evaluator ids are merged in (deduped).
      const assignedPanel = Array.from(
        new Set([slot.interviewerId, ...(dto.panelUserIds ?? [])].filter(Boolean)),
      );

      // Re-use a pending "Slot Available" interview of the same type, if any.
      let interview = await manager.findOne(Interview, {
        where: { applicationId: application.id, interviewType: dto.interviewType, status: 'Slot Available', organizationId: orgId },
        order: { round: 'DESC' },
      });
      if (interview) {
        interview.assignedPanel = Array.from(new Set([...(interview.assignedPanel ?? []), ...assignedPanel]));
        interview.status = 'Scheduled';
        interview.updatedBy = actorId;
      } else {
        const existingRounds = await manager.count(Interview, {
          where: { applicationId: application.id, interviewType: dto.interviewType },
        });
        interview = manager.create(Interview, {
          organizationId: orgId,
          applicationId: application.id,
          interviewType: dto.interviewType,
          round: existingRounds + 1,
          status: 'Scheduled',
          assignedPanel,
          createdBy: actorId,
          updatedBy: actorId,
        });
      }
      this.applySlot(interview, slot);
      await manager.save(interview);

      await this.bookSlot(manager, slot, interview.id, actorId);
      await this.syncApplicationFlatFields(manager, application, slot);

      return interview;
    });

    void this.notifyInterviewStatus(orgId, interview, 'Scheduled');
    void this.notifyPanel(orgId, interview, interview.assignedPanel ?? [], 'assigned');
    this.queueCalendarSync(orgId, interview.id, 'upsert');
    return interview;
  }

  async reschedule(orgId: string, interviewId: string, dto: RescheduleInterviewDto, actorId: string) {
    let newPanelMembers: string[] = [];
    const interview = await this.dataSource.transaction(async (manager) => {
      const interview = await manager.findOne(Interview, { where: { id: interviewId, organizationId: orgId } });
      if (!interview) {
        throw new NotFoundException(`Interview #${interviewId} not found`);
      }
      if (['Completed', 'Cancelled'].includes(interview.status)) {
        throw new BadRequestException(`Cannot reschedule an interview with status "${interview.status}".`);
      }

      const newSlot = await manager.findOne(InterviewSlot, { where: { id: dto.newSlotId, organizationId: orgId } });
      if (!newSlot) {
        throw new NotFoundException(`Interview slot #${dto.newSlotId} not found`);
      }
      if (newSlot.status !== 'Available') {
        throw new BadRequestException(`New slot is not available (current status: ${newSlot.status}).`);
      }
      if (newSlot.interviewType !== interview.interviewType) {
        throw new BadRequestException(`Slot is a ${newSlot.interviewType} slot, cannot reschedule a ${interview.interviewType} interview into it.`);
      }

      if (interview.slotId) {
        const oldSlot = await manager.findOne(InterviewSlot, { where: { id: interview.slotId, organizationId: orgId } });
        if (oldSlot && oldSlot.status === 'Booked') {
          await this.releaseSlot(manager, oldSlot, actorId);
        }
      }

      await this.bookSlot(manager, newSlot, interview.id, actorId);

      const panel = new Set(interview.assignedPanel ?? []);
      if (newSlot.interviewerId && !panel.has(newSlot.interviewerId)) {
        newPanelMembers = [newSlot.interviewerId];
        panel.add(newSlot.interviewerId);
      }
      interview.assignedPanel = Array.from(panel);
      this.applySlot(interview, newSlot);
      interview.status = 'Rescheduled';
      interview.updatedBy = actorId;
      await manager.save(interview);

      const application = await manager.findOne(Application, { where: { id: interview.applicationId, organizationId: orgId } });
      if (application) {
        await this.syncApplicationFlatFields(manager, application, newSlot);
      }

      return interview;
    });

    void this.notifyInterviewStatus(orgId, interview, 'Rescheduled');
    const existing = (interview.assignedPanel ?? []).filter((u) => !newPanelMembers.includes(u));
    void this.notifyPanel(orgId, interview, existing, 'rescheduled');
    void this.notifyPanel(orgId, interview, newPanelMembers, 'assigned');
    this.queueCalendarSync(orgId, interview.id, 'upsert');
    return interview;
  }

  async cancel(orgId: string, interviewId: string, actorId: string) {
    const interview = await this.dataSource.transaction(async (manager) => {
      const interview = await manager.findOne(Interview, { where: { id: interviewId, organizationId: orgId } });
      if (!interview) {
        throw new NotFoundException(`Interview #${interviewId} not found`);
      }
      if (['Completed', 'Cancelled'].includes(interview.status)) {
        throw new BadRequestException(`Interview is already ${interview.status}.`);
      }

      if (interview.slotId) {
        const slot = await manager.findOne(InterviewSlot, { where: { id: interview.slotId, organizationId: orgId } });
        if (slot && (slot.status || '').toLowerCase() === 'booked') {
          await this.releaseSlot(manager, slot, actorId);
        }
        interview.slotId = null as any;
      }

      interview.status = 'Cancelled';
      interview.updatedBy = actorId;
      return manager.save(interview);
    });

    void this.notifyInterviewStatus(orgId, interview, 'Cancelled');
    void this.notifyPanel(orgId, interview, interview.assignedPanel ?? [], 'cancelled');
    this.queueCalendarSync(orgId, interview.id, 'delete');
    return interview;
  }

  async markNoShow(orgId: string, interviewId: string, actorId: string) {
    const interview = await this.findOneOrThrow(interviewId, orgId);
    if (['Completed', 'Cancelled'].includes(interview.status)) {
      throw new BadRequestException(`Cannot mark an interview with status "${interview.status}" as no-show.`);
    }
    interview.status = 'No Show';
    interview.updatedBy = actorId;
    const saved = await this.interviewRepository.save(interview);

    void this.notifyInterviewStatus(orgId, saved, 'No Show');
    return saved;
  }

  async markCompleted(orgId: string, interviewId: string, dto: CompleteInterviewDto, actorId: string) {
    const interview = await this.findOneOrThrow(interviewId, orgId);
    if (['Cancelled'].includes(interview.status)) {
      throw new BadRequestException('Cannot complete a cancelled interview.');
    }
    interview.status = 'Completed';
    if (dto.outcome) interview.outcome = dto.outcome;
    interview.updatedBy = actorId;
    const saved = await this.interviewRepository.save(interview);

    // Stage-2 rollup: re-run in case evaluations for this interview were
    // already submitted before it was marked Completed (submitScores only
    // triggers the rollup at submit time, which may have happened earlier).
    await this.scoringService.computeCompositeScore(orgId, interview.applicationId);

    void this.notifyInterviewStatus(orgId, saved, 'Completed');
    return saved;
  }

  findAllByOrg(orgId: string, filters?: { applicationId?: string; interviewType?: string; status?: string }) {
    const query = this.interviewRepository
      .createQueryBuilder('interview')
      .leftJoinAndSelect('interview.slot', 'slot')
      .leftJoinAndSelect('slot.interviewer', 'slotInterviewer')
      .leftJoinAndSelect('interview.application', 'application')
      .where('interview.organization_id = :orgId', { orgId });

    if (filters?.applicationId) {
      query.andWhere('interview.application_id = :applicationId', { applicationId: filters.applicationId });
    }
    if (filters?.interviewType) {
      query.andWhere('interview.interview_type = :interviewType', { interviewType: filters.interviewType });
    }
    if (filters?.status) {
      query.andWhere('interview.status = :status', { status: filters.status });
    }

    query.orderBy('interview.created_at', 'DESC');
    return query.getMany();
  }

  async findOneOrThrow(id: string, orgId: string) {
    const interview = await this.interviewRepository.findOne({
      where: { id, organizationId: orgId },
      relations: ['slot', 'slot.interviewer', 'application'],
    });
    if (!interview) {
      throw new NotFoundException(`Interview #${id} not found`);
    }
    return interview;
  }

  // Keeps Application's flat interviewLocation/Date/Time columns (what the
  // GD-Interview list already reads) in sync with whichever slot is
  // currently booked, so B4's list page doesn't need to join through
  // Interview/InterviewSlot itself.
  private async syncApplicationFlatFields(manager: EntityManager, application: Application, slot: InterviewSlot) {
    application.interviewLocation = slot.location || application.interviewLocation;
    application.interviewDate = new Date(slot.slotDate);
    application.interviewTime = new Date(slot.startTime).toISOString().slice(11, 16);
    await manager.save(application);
  }
}
