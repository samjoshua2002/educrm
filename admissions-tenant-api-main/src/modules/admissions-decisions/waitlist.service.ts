import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { WaitlistEntry, WaitlistStatus } from './entities/waitlist-entry.entity.js';
import { AdmissionDecision } from './entities/admission-decision.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { ReleaseOfferDto, SeatAvailableDto, UpdateWaitlistDto } from './dto/acceptance.dto.js';
import { DecisionSupportService } from './decision-support.service.js';
import { OfferLettersService } from './offer-letters.service.js';
import { LetterTemplatesService, formatLetterDate } from './letter-templates.service.js';
import { LetterPdfService } from './letter-pdf.service.js';

const TRIGGER_LABELS: Record<string, string> = {
  offer_declined: 'Offer Declined',
  offer_expired: 'Offer Expired',
  offer_withdrawn: 'Offer Withdrawn',
  acceptance_expired: 'Acceptance Expired',
  seat_added: 'Seat Added',
  manual_review: 'Manual Review',
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Waitlist_Management: ranked per program. When a seat is vacated (offer
// declined / expired / withdrawn) the next ranked ACTIVE entry for that
// program gets an offer automatically (settings.waitlistMovementMode =
// 'auto') or staff are told who is next ('manual').
@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepository: Repository<WaitlistEntry>,
    @InjectRepository(AdmissionDecision)
    private readonly decisionRepository: Repository<AdmissionDecision>,
    private readonly support: DecisionSupportService,
    private readonly offerLetters: OfferLettersService,
    private readonly templates: LetterTemplatesService,
    private readonly pdf: LetterPdfService,
  ) {}

  private async currentEntry(orgId: string, applicationId: string) {
    return this.waitlistRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  private async entryOrThrow(orgId: string, applicationNo: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    const entry = await this.currentEntry(orgId, application.id);
    if (!entry) throw new NotFoundException('No waitlist entry exists for this application yet.');
    return { application, entry };
  }

  async getEntry(orgId: string, applicationNo: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    return this.currentEntry(orgId, application.id);
  }

  async getWaitlist(orgId: string, program?: string, status?: string) {
    const qb = this.waitlistRepository
      .createQueryBuilder('entry')
      .innerJoinAndSelect('entry.application', 'app')
      .where('entry.organization_id = :orgId', { orgId });
    if (status && status !== 'all') qb.andWhere('entry.waitlist_status = :status', { status });
    else if (!status) qb.andWhere('entry.waitlist_status = :status', { status: WaitlistStatus.ACTIVE });
    if (program) qb.andWhere('entry.program = :program', { program });
    const rows = await qb
      .orderBy('entry.program', 'ASC')
      .addOrderBy('entry.waitlist_rank IS NULL', 'ASC')
      .addOrderBy('entry.waitlist_rank', 'ASC')
      .addOrderBy('entry.created_at', 'ASC')
      .getMany();
    return rows.map((e) => ({
      ...e,
      application: undefined,
      applicationNo: e.application?.applicationNo,
      applicantName: e.application?.name,
      applicantEmail: e.application?.email,
      compositeScore: e.application?.compositeScore ?? null,
    }));
  }

  // Renumbers ACTIVE entries of a program 1..n keeping their order.
  async reRank(orgId: string, program: string | null) {
    const active = await this.waitlistRepository
      .createQueryBuilder('e')
      .where('e.organization_id = :orgId AND e.waitlist_status = :st', { orgId, st: WaitlistStatus.ACTIVE })
      .andWhere(program ? 'e.program = :program' : 'e.program IS NULL', { program })
      .orderBy('e.waitlist_rank IS NULL', 'ASC')
      .addOrderBy('e.waitlist_rank', 'ASC')
      .addOrderBy('e.created_at', 'ASC')
      .getMany();
    let rank = 1;
    for (const e of active) {
      if (e.waitlistRank !== rank) await this.waitlistRepository.update(e.id, { waitlistRank: rank });
      rank++;
    }
  }

  // Called when a decision "Waitlisted" is released.
  async addToWaitlist(application: Application, actorId: string | null, communicate: boolean) {
    let entry = await this.currentEntry(application.organizationId, application.id);
    if (entry && entry.waitlistStatus === WaitlistStatus.ACTIVE) return entry;

    // New entries join at the end of the program's active waitlist.
    const program = application.program || null;
    const count = await this.waitlistRepository.count({
      where: {
        organizationId: application.organizationId,
        program: program === null ? IsNull() : program,
        waitlistStatus: WaitlistStatus.ACTIVE,
      },
    });
    entry = this.waitlistRepository.create({
      organizationId: application.organizationId,
      applicationId: application.id,
      program,
      waitlistRank: count + 1,
      waitlistStatus: WaitlistStatus.ACTIVE,
      lastReviewDate: todayStr(),
      createdBy: actorId as string,
    });
    entry = await this.waitlistRepository.save(entry);
    application.waitlistStatus = `WL-${entry.waitlistRank}`;
    await this.support.saveApplication(application);
    if (communicate) await this.sendWaitlistLetter(entry, application);
    return entry;
  }

  // Waitlist letter from the default waitlist template, PDF attached.
  async sendWaitlistLetter(entry: WaitlistEntry, application: Application) {
    try {
      const template = await this.templates.resolve(application.organizationId, 'waitlist');
      const orgName = await this.support.organizationName(application.organizationId);
      const values = {
        Name: application.name,
        Program: entry.program || application.program,
        Application_No: application.applicationNo,
        Date: formatLetterDate(new Date()),
        Waitlist_Rank: entry.waitlistRank ?? '',
        Organization: orgName,
      };
      const html = this.templates.render(template.bodyHtml, values);
      const buffer = await this.pdf.renderPdf(html, { title: `Waitlist Letter ${application.applicationNo}`, organizationName: orgName });
      const sent = await this.pdf.sendWithAttachment({
        organizationId: application.organizationId,
        to: application.email,
        subject: this.templates.renderText(template.subject || 'Waitlist status - {{Application_No}}', values),
        html,
        attachments: [{ filename: `Waitlist-Letter-${application.applicationNo.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`, content: buffer }],
      });
      if (sent) await this.waitlistRepository.update(entry.id, { communicationSent: true });
    } catch (err) {
      this.logger.error(`Waitlist letter for ${application.applicationNo} failed: ${(err as Error).message}`);
    }
  }

  async updateEntry(orgId: string, applicationNo: string, dto: UpdateWaitlistDto, actorId: string) {
    const { entry } = await this.entryOrThrow(orgId, applicationNo);
    if (dto.alternateProgramOffered !== undefined) entry.alternateProgramOffered = dto.alternateProgramOffered || null;
    if (dto.movementTrigger !== undefined) entry.movementTrigger = dto.movementTrigger;
    if (dto.remarks !== undefined) entry.remarks = dto.remarks;
    entry.lastReviewDate = dto.lastReviewDate ?? todayStr();
    entry.updatedBy = actorId;

    if (dto.waitlistRank !== undefined && entry.waitlistStatus === WaitlistStatus.ACTIVE && dto.waitlistRank !== entry.waitlistRank) {
      // Move this entry to the new position; others shift.
      const others = await this.waitlistRepository
        .createQueryBuilder('e')
        .where('e.organization_id = :orgId AND e.waitlist_status = :st AND e.id != :id', {
          orgId, st: WaitlistStatus.ACTIVE, id: entry.id,
        })
        .andWhere(entry.program ? 'e.program = :program' : 'e.program IS NULL', { program: entry.program })
        .orderBy('e.waitlist_rank IS NULL', 'ASC')
        .addOrderBy('e.waitlist_rank', 'ASC')
        .addOrderBy('e.created_at', 'ASC')
        .getMany();
      const pos = Math.min(Math.max(1, dto.waitlistRank), others.length + 1);
      others.splice(pos - 1, 0, entry);
      let rank = 1;
      for (const e of others) {
        if (e.id !== entry.id && e.waitlistRank !== rank) await this.waitlistRepository.update(e.id, { waitlistRank: rank });
        if (e.id === entry.id) entry.waitlistRank = rank;
        rank++;
      }
    }
    return this.waitlistRepository.save(entry);
  }

  async releaseOffer(orgId: string, applicationNo: string, dto: ReleaseOfferDto, actorId: string) {
    const { entry } = await this.entryOrThrow(orgId, applicationNo);
    if (entry.waitlistStatus !== WaitlistStatus.ACTIVE) {
      throw new BadRequestException(`This waitlist entry is ${entry.waitlistStatus.replace(/_/g, ' ')}; only active entries can get an offer.`);
    }
    return this.releaseEntry(entry, dto.movementTrigger || 'manual_review', dto.alternateProgramOffered ?? null, actorId);
  }

  // Gives the waitlisted applicant an offer: the decision becomes "Offer Made"
  // (a system change to the locked waitlist decision), an offer letter is
  // generated from the default template and sent, and the waitlist re-ranks.
  async releaseEntry(entry: WaitlistEntry, trigger: string, alternateProgram: string | null, actorId: string | null) {
    const application = await this.support.findApplicationById(entry.applicationId);
    if (!application) throw new NotFoundException('Application not found');

    // Claim the entry first: two seats freed at the same time must not both
    // release an offer to the same applicant.
    const claim = await this.waitlistRepository.update(
      { id: entry.id, waitlistStatus: WaitlistStatus.ACTIVE },
      { waitlistStatus: WaitlistStatus.OFFER_RELEASED },
    );
    if (!claim.affected) {
      if (actorId) throw new BadRequestException('This waitlist entry is no longer active.');
      return null;
    }

    const decision = await this.decisionRepository.findOne({
      where: { organizationId: entry.organizationId, applicationId: application.id },
      order: { createdAt: 'DESC' },
    });

    if (alternateProgram) entry.alternateProgramOffered = alternateProgram;
    const program = entry.alternateProgramOffered || entry.program || application.program;

    let offerSent = false;
    let offerId: string | null = null;
    try {
      const offer = await this.offerLetters.generateFor(application, decision, { offerType: 'regular', programOffered: program }, actorId, true);
      const sent = await this.offerLetters.sendOffer(offer.id, actorId, false);
      offerId = offer.id;
      offerSent = !!sent?.sentToCandidate;
    } catch (err) {
      this.logger.error(`Offer for waitlisted ${application.applicationNo} could not be issued: ${(err as Error).message}`);
      // No offer went out: the applicant stays on the active waitlist.
      await this.waitlistRepository.update(
        { id: entry.id, waitlistStatus: WaitlistStatus.OFFER_RELEASED },
        { waitlistStatus: WaitlistStatus.ACTIVE },
      );
      if (actorId) throw err;
      await this.support.notifyStaff({
        organizationId: entry.organizationId,
        type: 'waitlist_movement',
        severity: 'warning',
        title: `Waitlist offer could not be issued: ${application.name} (${application.applicationNo})`,
        body: `${(err as Error).message}. Release the offer manually.`,
        link: `/organization/decisions/${encodeURIComponent(application.applicationNo)}`,
        relatedEntityId: entry.id,
      });
      return null;
    }

    if (decision) {
      decision.finalDecision = 'offer_made';
      decision.approvalStatus = 'approved';
      decision.decisionDate = new Date();
      decision.internalRemarks = `${decision.internalRemarks ? decision.internalRemarks + '\n' : ''}[Waitlist] Offer released on ${formatLetterDate(new Date())} (${TRIGGER_LABELS[trigger] || trigger}).`;
      decision.updatedBy = actorId as string;
      await this.decisionRepository.save(decision);
    }

    const previousRank = entry.waitlistRank;
    entry.waitlistStatus = WaitlistStatus.OFFER_RELEASED;
    entry.offerReleased = true;
    entry.releasedOfferId = offerId;
    entry.movementTrigger = trigger;
    entry.communicationSent = offerSent;
    entry.lastReviewDate = todayStr();
    entry.updatedBy = actorId as string;
    await this.waitlistRepository.save(entry);

    application.formStatus = 'accepted';
    application.waitlistStatus = 'offer_released';
    await this.support.saveApplication(application);

    await this.reRank(entry.organizationId, entry.program);

    await this.support.notifyStaff({
      organizationId: entry.organizationId,
      type: 'waitlist_movement',
      severity: 'info',
      title: `Waitlist moved: offer released to ${application.name} (${application.applicationNo})`,
      body: `Rank ${previousRank ?? '-'} on the ${entry.program || 'program'} waitlist received an offer for ${program} (${TRIGGER_LABELS[trigger] || trigger}).`,
      link: `/organization/decisions/${encodeURIComponent(application.applicationNo)}`,
      relatedEntityId: entry.id,
    });
    await this.support.notifyApplicant(application, {
      type: 'waitlist_offer_released',
      severity: 'success',
      title: 'A seat is available - you have an offer',
      body: `You moved off the waitlist and received an offer for ${program}.`,
      relatedEntityId: entry.id,
    });
    return this.waitlistRepository.findOne({ where: { id: entry.id } });
  }

  async closeWaitlistEntry(orgId: string, applicationNo: string, actorId: string) {
    const { application, entry } = await this.entryOrThrow(orgId, applicationNo);
    if (entry.waitlistStatus === WaitlistStatus.CLOSED) return entry;
    entry.waitlistStatus = WaitlistStatus.CLOSED;
    entry.lastReviewDate = todayStr();
    entry.updatedBy = actorId;
    const saved = await this.waitlistRepository.save(entry);
    await this.reRank(orgId, entry.program);
    application.waitlistStatus = 'closed';
    await this.support.saveApplication(application);
    return saved;
  }

  // A seat for `program` became free.
  async onSeatVacated(orgId: string, program: string | null, trigger: string, vacatedApplicationId?: string) {
    const findNext = (skip: string[]) =>
      this.waitlistRepository
        .createQueryBuilder('e')
        .where('e.organization_id = :orgId AND e.waitlist_status = :st', { orgId, st: WaitlistStatus.ACTIVE })
        .andWhere(program ? 'e.program = :program' : 'e.program IS NULL', { program })
        .andWhere(vacatedApplicationId ? 'e.application_id != :vac' : '1=1', { vac: vacatedApplicationId })
        .andWhere(skip.length ? 'e.id NOT IN (:...skip)' : '1=1', { skip })
        .orderBy('e.waitlist_rank IS NULL', 'ASC')
        .addOrderBy('e.waitlist_rank', 'ASC')
        .addOrderBy('e.created_at', 'ASC')
        .getOne();
    let next = await findNext([]);

    if (!next) {
      await this.support.notifyStaff({
        organizationId: orgId,
        type: 'seat_available',
        title: `Seat available in ${program || 'a program'}`,
        body: `${TRIGGER_LABELS[trigger] || trigger}. Nobody is on the active waitlist for this program.`,
        link: '/organization/decisions?tab=waitlist',
      });
      return null;
    }

    const settings = await this.support.getSettings(orgId);
    if (settings.waitlistMovementMode === 'auto') {
      // If the next entry was taken concurrently or its offer failed, try the
      // following ranks (bounded) so the freed seat is not silently lost.
      const tried: string[] = [];
      while (next && tried.length < 5) {
        const released = await this.releaseEntry(next, trigger, null, null);
        if (released) return released;
        tried.push(next.id);
        next = await findNext(tried);
      }
      return null;
    }

    const app = await this.support.findApplicationById(next.applicationId);
    next.movementTrigger = trigger;
    next.lastReviewDate = todayStr();
    await this.waitlistRepository.save(next);
    await this.support.notifyStaff({
      organizationId: orgId,
      type: 'waitlist_movement',
      severity: 'warning',
      title: `Seat available in ${program || 'a program'} - release the next waitlist offer`,
      body: `${TRIGGER_LABELS[trigger] || trigger}. Next on the waitlist: rank ${next.waitlistRank} ${app ? `${app.name} (${app.applicationNo})` : ''}.`,
      link: app ? `/organization/decisions/${encodeURIComponent(app.applicationNo)}` : '/organization/decisions?tab=waitlist',
      relatedEntityId: next.id,
    });
    return next;
  }

  // Staff: N new seats in a program -> release offers to the next N ranks.
  async seatsAdded(orgId: string, dto: SeatAvailableDto, actorId: string) {
    const seats = dto.seats ?? 1;
    const released: WaitlistEntry[] = [];
    for (let i = 0; i < seats; i++) {
      const next = await this.waitlistRepository.findOne({
        where: { organizationId: orgId, program: dto.program, waitlistStatus: WaitlistStatus.ACTIVE, waitlistRank: Not(IsNull()) },
        order: { waitlistRank: 'ASC', createdAt: 'ASC' },
      });
      if (!next) break;
      const r = await this.releaseEntry(next, 'seat_added', null, actorId);
      if (r) released.push(r);
    }
    return { released: released.length, entries: released };
  }
}
