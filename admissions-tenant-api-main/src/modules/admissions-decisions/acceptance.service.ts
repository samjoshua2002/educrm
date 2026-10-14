import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModuleRef } from '@nestjs/core';
import { LessThan, Not, Repository } from 'typeorm';
import { OfferAcceptance, AcceptanceStatus } from './entities/offer-acceptance.entity.js';
import { OfferLetter } from './entities/offer-letter.entity.js';
import { WaitlistEntry, WaitlistStatus } from './entities/waitlist-entry.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { MailerService } from '../notifications/mailer.service.js';
import { RecordAcceptanceDto, SendOnboardingDto, UpdateAcceptanceDto } from './dto/acceptance.dto.js';
import { DecisionSupportService } from './decision-support.service.js';
import { escapeHtml, formatLetterDate, formatMoney } from './letter-templates.service.js';

// Rows handled per scheduler run.
const BATCH_SIZE = 200;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateOnly(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  return v.toISOString().slice(0, 10);
}

// Offer_Acceptances. One record per sent offer letter. Tracks the candidate's
// accept / decline, the seat booking fee (paid through the payments module's
// Razorpay seat-booking order), onboarding and enrollment.
@Injectable()
export class AcceptanceService {
  private readonly logger = new Logger(AcceptanceService.name);

  constructor(
    @InjectRepository(OfferAcceptance)
    private readonly acceptanceRepository: Repository<OfferAcceptance>,
    @InjectRepository(OfferLetter)
    private readonly offerLetterRepository: Repository<OfferLetter>,
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepository: Repository<WaitlistEntry>,
    private readonly mailerService: MailerService,
    private readonly support: DecisionSupportService,
    private readonly moduleRef: ModuleRef,
  ) {}

  // Lazy lookup avoids a constructor cycle (Waitlist -> OfferLetters -> Acceptance).
  private async waitlist() {
    const { WaitlistService } = await import('./waitlist.service.js');
    return this.moduleRef.get(WaitlistService, { strict: false });
  }

  private async findCurrentOffer(orgId: string, applicationId: string): Promise<OfferLetter | null> {
    return this.offerLetterRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findForOffer(offerLetterId: string): Promise<OfferAcceptance | null> {
    return this.acceptanceRepository.findOne({ where: { offerLetterId }, order: { createdAt: 'DESC' } });
  }

  private async context(orgId: string, applicationNo: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    const offer = await this.findCurrentOffer(orgId, application.id);
    if (!offer) throw new NotFoundException('No offer letter exists for this application yet.');
    const acceptance = await this.findForOffer(offer.id);
    if (!acceptance) {
      throw new NotFoundException('No acceptance record exists yet. It is created when the offer letter is sent.');
    }
    return { application, offer, acceptance };
  }

  // Called when an offer letter is sent. Idempotent per offer letter.
  async createAcceptanceRecord(offerLetterId: string, actorId?: string): Promise<OfferAcceptance> {
    const existing = await this.findForOffer(offerLetterId);
    if (existing) return existing;

    const offer = await this.offerLetterRepository.findOne({ where: { id: offerLetterId } });
    if (!offer) throw new NotFoundException(`Offer letter ${offerLetterId} not found`);

    const settings = await this.support.getSettings(offer.organizationId);
    const seatBookingFee = await this.support.seatBookingFee(offer.organizationId);
    let deadline = addDays(settings.acceptanceWindowDays || 15);
    const validTill = dateOnly(offer.offerValidTill);
    if (validTill && validTill < deadline) deadline = validTill;

    const acceptance = this.acceptanceRepository.create({
      offerLetterId: offer.id,
      seatBookingFee,
      acceptanceDeadline: deadline,
      acceptanceStatus: AcceptanceStatus.PENDING,
      feePaymentStatus: seatBookingFee > 0 ? 'pending' : 'waived',
      feePaymentLink: this.support.portalUrl('/results') || null,
      enrollmentStatus: 'not_enrolled',
      onboardingInfo: settings.defaultOnboardingInfo ?? null,
      createdBy: actorId,
    });
    return this.acceptanceRepository.save(acceptance);
  }

  async getAcceptance(orgId: string, applicationNo: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    const offer = await this.findCurrentOffer(orgId, application.id);
    if (!offer) return null;
    return this.findForOffer(offer.id);
  }

  async listAcceptances(orgId: string, status?: string) {
    const qb = this.acceptanceRepository
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.offerLetter', 'o')
      .innerJoinAndSelect('o.application', 'app')
      .where('o.organization_id = :orgId', { orgId })
      .orderBy('a.created_at', 'DESC');
    if (status) qb.andWhere('a.acceptance_status = :status', { status });
    const rows = await qb.getMany();
    return rows.map((a) => ({
      ...a,
      offerLetter: undefined,
      offerNo: a.offerLetter?.offerNo,
      offerStatus: a.offerLetter?.offerStatus,
      programOffered: a.offerLetter?.programOffered,
      applicationNo: a.offerLetter?.application?.applicationNo,
      applicantName: a.offerLetter?.application?.name,
      applicantEmail: a.offerLetter?.application?.email,
    }));
  }

  // Staff edits (fee, deadline, payment link/reference, onboarding info, enrollment).
  async updateAcceptance(orgId: string, applicationNo: string, dto: UpdateAcceptanceDto, actorId: string) {
    const { acceptance } = await this.context(orgId, applicationNo);
    const wasPaid = acceptance.feePaymentStatus === 'paid' || acceptance.feePaymentStatus === 'waived';
    if (dto.acceptanceDeadline !== undefined) acceptance.acceptanceDeadline = dto.acceptanceDeadline;
    if (dto.seatBookingFee !== undefined) acceptance.seatBookingFee = dto.seatBookingFee;
    if (dto.feePaymentLink !== undefined) acceptance.feePaymentLink = dto.feePaymentLink;
    if (dto.feePaymentStatus !== undefined) acceptance.feePaymentStatus = dto.feePaymentStatus;
    if (dto.paymentReferenceId !== undefined) acceptance.paymentReferenceId = dto.paymentReferenceId;
    if (dto.onboardingInfo !== undefined) acceptance.onboardingInfo = dto.onboardingInfo;
    if (dto.enrollmentStatus !== undefined) acceptance.enrollmentStatus = dto.enrollmentStatus;
    acceptance.updatedBy = actorId;
    await this.acceptanceRepository.save(acceptance);
    const nowPaid = acceptance.feePaymentStatus === 'paid' || acceptance.feePaymentStatus === 'waived';
    if (!wasPaid && nowPaid) await this.onFeePaid(acceptance.id);
    return this.acceptanceRepository.findOne({ where: { id: acceptance.id } });
  }

  // Staff records the candidate's answer on their behalf.
  async recordCandidateAcceptance(orgId: string, applicationNo: string, dto: RecordAcceptanceDto, actorId?: string) {
    const { application, offer, acceptance } = await this.context(orgId, applicationNo);
    return this.respond(application, offer, acceptance, dto, actorId);
  }

  // Shared by staff and the student portal.
  async respond(
    application: Application,
    offer: OfferLetter,
    acceptance: OfferAcceptance,
    dto: RecordAcceptanceDto,
    actorId?: string,
  ) {
    if (acceptance.acceptanceStatus !== AcceptanceStatus.PENDING) {
      throw new BadRequestException(`This offer has already been ${acceptance.acceptanceStatus}.`);
    }
    if (offer.offerStatus !== 'sent') {
      throw new BadRequestException(`This offer is ${offer.offerStatus} and can no longer be answered.`);
    }
    const deadline = dateOnly(acceptance.acceptanceDeadline);
    if (deadline && deadline < todayStr()) {
      throw new BadRequestException('The acceptance deadline has passed.');
    }
    const validTill = dateOnly(offer.offerValidTill);
    if (validTill && validTill < todayStr()) {
      throw new BadRequestException('This offer has expired.');
    }

    acceptance.candidateConfirmationDate = new Date();
    if (actorId) acceptance.updatedBy = actorId;

    if (dto.accept) {
      acceptance.acceptanceStatus = AcceptanceStatus.ACCEPTED;
      const feeDone = acceptance.feePaymentStatus === 'paid' || acceptance.feePaymentStatus === 'waived';
      acceptance.enrollmentStatus = feeDone ? 'confirmed' : 'pending';
    } else {
      acceptance.acceptanceStatus = AcceptanceStatus.DECLINED;
      acceptance.enrollmentStatus = 'cancelled';
      acceptance.declineReason = dto.declineReason ?? null;
    }
    // Conditional update: the answer is recorded only once, even when two
    // requests (or the fee payment) arrive at the same time.
    const changes: Partial<OfferAcceptance> = {
      acceptanceStatus: acceptance.acceptanceStatus,
      enrollmentStatus: acceptance.enrollmentStatus,
      candidateConfirmationDate: acceptance.candidateConfirmationDate,
    };
    if (!dto.accept) changes.declineReason = acceptance.declineReason;
    if (actorId) changes.updatedBy = actorId;
    const result = await this.acceptanceRepository.update(
      { id: acceptance.id, acceptanceStatus: AcceptanceStatus.PENDING },
      changes,
    );
    if (!result.affected) {
      throw new BadRequestException('This offer has already been answered.');
    }

    await this.mailerService.sendAcceptanceConfirmationEmail(application, acceptance);

    // Waitlist bookkeeping for offers that came from the waitlist.
    const entry = await this.waitlistRepository.findOne({
      where: { applicationId: application.id, waitlistStatus: WaitlistStatus.OFFER_RELEASED },
      order: { createdAt: 'DESC' },
    });
    if (entry) {
      entry.waitlistStatus = dto.accept ? WaitlistStatus.CONVERTED : WaitlistStatus.CLOSED;
      entry.lastReviewDate = todayStr();
      await this.waitlistRepository.save(entry);
    }

    await this.support.notifyStaff({
      organizationId: application.organizationId,
      type: dto.accept ? 'offer_accepted' : 'offer_declined',
      severity: dto.accept ? 'success' : 'warning',
      title: dto.accept
        ? `Offer accepted: ${application.name} (${application.applicationNo})`
        : `Offer declined: ${application.name} (${application.applicationNo})`,
      body: dto.accept
        ? `${application.name} accepted the offer for ${offer.programOffered || application.program}.`
        : `${application.name} declined the offer for ${offer.programOffered || application.program}.${dto.declineReason ? ` Reason: ${dto.declineReason}` : ''}`,
      link: `/organization/decisions/${encodeURIComponent(application.applicationNo)}`,
      relatedEntityId: acceptance.id,
    });

    if (!dto.accept) {
      // A seat is free: move the waitlist for this program.
      try {
        const waitlist = await this.waitlist();
        await waitlist.onSeatVacated(application.organizationId, offer.programOffered || application.program, 'offer_declined', application.id);
      } catch (err) {
        this.logger.error(`Waitlist movement after decline failed: ${(err as Error).message}`);
      }
    }

    return acceptance;
  }

  // Seat booking fee paid (payments module sets feePaymentStatus = 'paid').
  // Paying the fee counts as accepting a pending offer; enrollment is confirmed.
  private readonly feeInProgress = new Set<string>();

  async onFeePaid(acceptanceId: string) {
    if (this.feeInProgress.has(acceptanceId)) return;
    this.feeInProgress.add(acceptanceId);
    try {
      await this.confirmAfterFee(acceptanceId);
    } finally {
      this.feeInProgress.delete(acceptanceId);
    }
  }

  private async confirmAfterFee(acceptanceId: string) {
    const acceptance = await this.acceptanceRepository.findOne({
      where: { id: acceptanceId },
      relations: ['offerLetter'],
    });
    if (!acceptance) return;
    const paid = acceptance.feePaymentStatus === 'paid' || acceptance.feePaymentStatus === 'waived';
    if (!paid || acceptance.enrollmentStatus === 'confirmed') return;
    if (acceptance.acceptanceStatus !== AcceptanceStatus.PENDING && acceptance.acceptanceStatus !== AcceptanceStatus.ACCEPTED) return;
    // A withdrawn / expired offer is not confirmed by a late payment.
    if (acceptance.offerLetter?.offerStatus !== 'sent') return;

    const previousStatus = acceptance.acceptanceStatus;
    const wasPending = previousStatus === AcceptanceStatus.PENDING;
    // Only a real payment counts as accepting; a waived fee still needs the candidate's answer.
    if (wasPending && acceptance.feePaymentStatus !== 'paid') return;
    if (wasPending) {
      acceptance.acceptanceStatus = AcceptanceStatus.ACCEPTED;
      acceptance.candidateConfirmationDate = new Date();
    }
    acceptance.enrollmentStatus = 'confirmed';
    const result = await this.acceptanceRepository.update(
      { id: acceptance.id, acceptanceStatus: previousStatus, enrollmentStatus: Not('confirmed') },
      {
        acceptanceStatus: acceptance.acceptanceStatus,
        candidateConfirmationDate: acceptance.candidateConfirmationDate,
        enrollmentStatus: 'confirmed',
      },
    );
    if (!result.affected) return;

    const application = acceptance.offerLetter ? await this.support.findApplicationById(acceptance.offerLetter.applicationId) : null;
    if (!application) return;

    if (wasPending) {
      const entry = await this.waitlistRepository.findOne({
        where: { applicationId: application.id, waitlistStatus: WaitlistStatus.OFFER_RELEASED },
      });
      if (entry) {
        entry.waitlistStatus = WaitlistStatus.CONVERTED;
        entry.lastReviewDate = todayStr();
        await this.waitlistRepository.save(entry);
      }
    }

    await this.support.notifyStaff({
      organizationId: application.organizationId,
      type: 'enrollment_confirmed',
      severity: 'success',
      title: `Enrollment confirmed: ${application.name} (${application.applicationNo})`,
      body: `Seat booking fee ${formatMoney(acceptance.seatBookingFee)} received${acceptance.paymentReferenceId ? ` (ref ${acceptance.paymentReferenceId})` : ''}.`,
      link: `/organization/decisions/${encodeURIComponent(application.applicationNo)}`,
      relatedEntityId: acceptance.id,
    });
    await this.support.notifyApplicant(application, {
      type: 'enrollment_confirmed',
      severity: 'success',
      title: 'Your seat is confirmed',
      body: 'We received your seat booking fee. Your enrollment is confirmed.',
    });
  }

  // Safety net for payments recorded without the entity listener firing.
  async reconcilePaidFees() {
    const rows = await this.acceptanceRepository
      .createQueryBuilder('a')
      .innerJoin('a.offerLetter', 'o')
      .select(['a.id', 'a.updatedAt'])
      .where('a.fee_payment_status IN (:...paid)', { paid: ['paid', 'waived'] })
      .andWhere('a.acceptance_status IN (:...st)', { st: [AcceptanceStatus.PENDING, AcceptanceStatus.ACCEPTED] })
      .andWhere("a.enrollment_status != 'confirmed'")
      .andWhere("NOT (a.fee_payment_status = 'waived' AND a.acceptance_status = :pending)", { pending: AcceptanceStatus.PENDING })
      .andWhere("o.offer_status = 'sent'")
      .orderBy('a.updatedAt', 'ASC')
      .limit(BATCH_SIZE)
      .getMany();
    for (const r of rows) {
      try {
        await this.onFeePaid(r.id);
      } catch (err) {
        this.logger.error(`Enrollment confirmation for acceptance ${r.id} failed: ${(err as Error).message}`);
      }
    }
  }

  async sendOnboardingPackage(orgId: string, applicationNo: string, dto: SendOnboardingDto, actorId: string) {
    const { application, offer, acceptance } = await this.context(orgId, applicationNo);
    if (acceptance.acceptanceStatus !== AcceptanceStatus.ACCEPTED) {
      throw new BadRequestException('The onboarding package can be sent only after the offer is accepted.');
    }
    if (dto.onboardingInfo !== undefined) acceptance.onboardingInfo = dto.onboardingInfo;
    const info = acceptance.onboardingInfo || (await this.support.getSettings(orgId)).defaultOnboardingInfo || '';
    if (!info.trim()) {
      throw new BadRequestException('Enter the onboarding information to send.');
    }
    const orgName = await this.support.organizationName(orgId);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color:#111827;">Welcome to ${escapeHtml(orgName || 'your new institution')}</h2>
        <p>Dear ${escapeHtml(application.name)},</p>
        <p>Thank you for accepting your offer for <strong>${escapeHtml(offer.programOffered || application.program)}</strong>
        (Application No. ${escapeHtml(application.applicationNo)}). Here is your onboarding package:</p>
        <div style="border:1px solid #e5e7eb; border-radius:8px; padding:16px; background:#f9fafb;">
          ${escapeHtml(info).replace(/\r?\n/g, '<br/>')}
        </div>
        <p style="margin-top:16px;">Enrollment status: <strong>${escapeHtml(acceptance.enrollmentStatus.replace(/_/g, ' '))}</strong></p>
      </div>`;
    const sent = await this.mailerService.sendMail({
      to: application.email,
      subject: `Onboarding package - ${application.applicationNo}`,
      html,
      organizationId: orgId,
    });
    if (!sent) {
      throw new BadRequestException('The onboarding email could not be sent. Check the email (SMTP) settings.');
    }
    acceptance.onboardingPackageSent = true;
    acceptance.onboardingSentAt = new Date();
    acceptance.updatedBy = actorId;
    await this.acceptanceRepository.save(acceptance);
    await this.support.notifyApplicant(application, {
      type: 'onboarding_sent',
      title: 'Your onboarding package has been sent',
      body: 'Check your email for joining instructions.',
    });
    return acceptance;
  }

  // Cron: pending acceptances past the deadline expire, the offer expires
  // with them and the waitlist moves.
  async expireOverdue(): Promise<number> {
    const overdue = await this.acceptanceRepository.find({
      where: { acceptanceStatus: AcceptanceStatus.PENDING, acceptanceDeadline: LessThan(todayStr()) as any },
      relations: ['offerLetter'],
      order: { acceptanceDeadline: 'ASC' },
      take: BATCH_SIZE,
    });
    let count = 0;
    for (const acceptance of overdue) {
      try {
        if (await this.expireOne(acceptance)) count++;
      } catch (err) {
        this.logger.error(`Expiring acceptance ${acceptance.id} failed: ${(err as Error).message}`);
      }
    }
    return count;
  }

  private async expireOne(acceptance: OfferAcceptance): Promise<boolean> {
    // Conditional update: skip if the candidate answered in the meantime.
    const result = await this.acceptanceRepository.update(
      { id: acceptance.id, acceptanceStatus: AcceptanceStatus.PENDING },
      { acceptanceStatus: AcceptanceStatus.EXPIRED, enrollmentStatus: 'cancelled' },
    );
    if (!result.affected) return false;
    acceptance.acceptanceStatus = AcceptanceStatus.EXPIRED;
    acceptance.enrollmentStatus = 'cancelled';
    const offer = acceptance.offerLetter;
    if (!offer) return true;
    if (offer.offerStatus === 'sent' || offer.offerStatus === 'generated') {
      await this.offerLetterRepository.update(offer.id, { offerStatus: 'expired', statusChangedAt: new Date() });
    }
    const application = await this.support.findApplicationById(offer.applicationId);
    if (!application) return true;
    const entry = await this.waitlistRepository.findOne({
      where: { applicationId: application.id, waitlistStatus: WaitlistStatus.OFFER_RELEASED },
    });
    if (entry) {
      entry.waitlistStatus = WaitlistStatus.CLOSED;
      entry.lastReviewDate = todayStr();
      await this.waitlistRepository.save(entry);
    }
    await this.support.notifyStaff({
      organizationId: application.organizationId,
      type: 'acceptance_expired',
      severity: 'warning',
      title: `Acceptance deadline passed: ${application.name} (${application.applicationNo})`,
      body: `The offer for ${offer.programOffered || application.program} expired without a response (deadline ${formatLetterDate(acceptance.acceptanceDeadline)}).`,
      link: `/organization/decisions/${encodeURIComponent(application.applicationNo)}`,
      relatedEntityId: acceptance.id,
    });
    await this.support.notifyApplicant(application, {
      type: 'acceptance_expired',
      severity: 'warning',
      title: 'Your offer has expired',
      body: 'The deadline to accept your offer has passed.',
    });
    try {
      const waitlist = await this.waitlist();
      await waitlist.onSeatVacated(application.organizationId, offer.programOffered || application.program, 'acceptance_expired', application.id);
    } catch (err) {
      this.logger.error(`Waitlist movement after expiry failed: ${(err as Error).message}`);
    }
    return true;
  }
}
