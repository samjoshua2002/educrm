import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry, WaitlistStatus } from './entities/waitlist-entry.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { MailerService } from '../notifications/mailer.service.js';
import { AddToWaitlistDto } from './dto/add-to-waitlist.dto.js';
import { ReleaseOfferDto } from './dto/release-offer.dto.js';

// Phase 6b — Waitlist Management. Created automatically when
// AdmissionDecisionsService.finalizeDecision locks a decision with
// finalDecision = 'waitlisted' (see admission-decisions.service.ts).
// releaseOffer() only flags the entry — it deliberately does NOT
// auto-generate a real OfferLetter; an admin follows up manually via the
// existing Phase 6a offer-letter generation endpoint, keeping this service
// simple and avoiding cross-module orchestration.
@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepository: Repository<WaitlistEntry>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly mailerService: MailerService,
  ) {}

  private async findApplication(orgId: string, applicationNo: string): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { applicationNo, organizationId: orgId },
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationNo} not found`);
    }
    return application;
  }

  private async findCurrentEntry(orgId: string, applicationId: string): Promise<WaitlistEntry | null> {
    return this.waitlistRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  private async findCurrentEntryOrThrow(orgId: string, applicationId: string): Promise<WaitlistEntry> {
    const entry = await this.findCurrentEntry(orgId, applicationId);
    if (!entry) {
      throw new NotFoundException('No waitlist entry exists for this application yet.');
    }
    return entry;
  }

  // Upserts the active waitlist entry for an application — called both from
  // AdmissionDecisionsService.finalizeDecision (auto) and from the
  // PATCH .../waitlist admin endpoint (rank/remarks edits).
  async addToWaitlist(orgId: string, applicationNo: string, dto: AddToWaitlistDto) {
    const application = await this.findApplication(orgId, applicationNo);
    let entry = await this.findCurrentEntry(orgId, application.id);

    if (!entry || entry.waitlistStatus === WaitlistStatus.CLOSED) {
      entry = this.waitlistRepository.create({
        organizationId: orgId,
        applicationId: application.id,
        movementTrigger: 'admission_decision_waitlisted',
        waitlistStatus: WaitlistStatus.ACTIVE,
      });
    }

    if (dto.waitlistRank !== undefined) entry.waitlistRank = dto.waitlistRank;
    if (dto.remarks !== undefined) entry.remarks = dto.remarks;
    entry.lastReviewDate = new Date();

    return this.waitlistRepository.save(entry);
  }

  async getEntry(orgId: string, applicationNo: string) {
    const application = await this.findApplication(orgId, applicationNo);
    return this.findCurrentEntryOrThrow(orgId, application.id);
  }

  // Full listing for an org — active entries only, ordered by rank
  // (unranked entries sort last).
  async getWaitlist(orgId: string) {
    return this.waitlistRepository
      .createQueryBuilder('entry')
      .where('entry.organization_id = :orgId', { orgId })
      .andWhere('entry.waitlist_status = :status', { status: WaitlistStatus.ACTIVE })
      .orderBy('entry.waitlist_rank IS NULL', 'ASC')
      .addOrderBy('entry.waitlist_rank', 'ASC')
      .addOrderBy('entry.created_at', 'ASC')
      .getMany();
  }

  // Flags the entry as offer-released and notifies the candidate. Does NOT
  // generate an OfferLetter — see class-level comment.
  async releaseOffer(orgId: string, applicationNo: string, dto: ReleaseOfferDto) {
    const application = await this.findApplication(orgId, applicationNo);
    const entry = await this.findCurrentEntryOrThrow(orgId, application.id);
    if (entry.waitlistStatus === WaitlistStatus.CLOSED) {
      throw new BadRequestException('This waitlist entry is closed and cannot have an offer released.');
    }

    entry.waitlistStatus = WaitlistStatus.OFFER_RELEASED;
    entry.offerReleased = true;
    entry.movementTrigger = 'seat_available';
    if (dto.alternateProgramOffered !== undefined) {
      entry.alternateProgramOffered = dto.alternateProgramOffered;
    }
    entry.communicationSent = true;
    await this.waitlistRepository.save(entry);

    await this.mailerService.sendWaitlistOfferReleasedEmail(application, entry);

    return entry;
  }

  async closeWaitlistEntry(orgId: string, applicationNo: string) {
    const application = await this.findApplication(orgId, applicationNo);
    const entry = await this.findCurrentEntryOrThrow(orgId, application.id);
    entry.waitlistStatus = WaitlistStatus.CLOSED;
    return this.waitlistRepository.save(entry);
  }
}
