import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ModuleRef } from '@nestjs/core';
import { In, LessThan, Repository } from 'typeorm';
import { OfferLetter } from './entities/offer-letter.entity.js';
import { AdmissionDecision } from './entities/admission-decision.entity.js';
import { AcceptanceStatus, OfferAcceptance } from './entities/offer-acceptance.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { GenerateOfferLetterDto, OfferListQueryDto } from './dto/offer.dto.js';
import { AcceptanceService } from './acceptance.service.js';
import { DecisionSupportService } from './decision-support.service.js';
import { LetterTemplatesService, escapeHtml, formatLetterDate, formatMoney } from './letter-templates.service.js';
import { LetterPdfService } from './letter-pdf.service.js';

const OFFER_TYPE_LABELS: Record<string, string> = {
  regular: 'Regular',
  conditional: 'Conditional',
  scholarship: 'Scholarship',
};

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
  return typeof v === 'string' ? v.slice(0, 10) : v.toISOString().slice(0, 10);
}

export interface OfferParams {
  offerType: string;
  programOffered?: string | null;
  letterTemplateId?: string | null;
  offerValidTill?: string | null;
  scholarshipAmount?: number | null;
  conditions?: string | null;
}

// Offer_Letters: generation from a LetterTemplate into a real PDF (pdfkit),
// sending by email with the PDF attached, withdraw, and automatic expiry.
@Injectable()
export class OfferLettersService {
  private readonly logger = new Logger(OfferLettersService.name);

  constructor(
    @InjectRepository(OfferLetter)
    private readonly offerLetterRepository: Repository<OfferLetter>,
    @InjectRepository(AdmissionDecision)
    private readonly decisionRepository: Repository<AdmissionDecision>,
    @InjectRepository(OfferAcceptance)
    private readonly acceptanceRepository: Repository<OfferAcceptance>,
    private readonly acceptanceService: AcceptanceService,
    private readonly support: DecisionSupportService,
    private readonly templates: LetterTemplatesService,
    private readonly pdf: LetterPdfService,
    private readonly moduleRef: ModuleRef,
  ) {}

  private async waitlist() {
    const { WaitlistService } = await import('./waitlist.service.js');
    return this.moduleRef.get(WaitlistService, { strict: false });
  }

  private pdfUrl(offer: OfferLetter) {
    return `/organizations/${offer.organizationId}/offer-letters/${offer.id}/pdf`;
  }

  private async findCurrentOffer(orgId: string, applicationId: string): Promise<OfferLetter | null> {
    return this.offerLetterRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOfferLetter(orgId: string, applicationNo: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    return this.findCurrentOffer(orgId, application.id);
  }

  async getOfferHistory(orgId: string, applicationNo: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    return this.offerLetterRepository.find({
      where: { organizationId: orgId, applicationId: application.id },
      order: { createdAt: 'DESC' },
    });
  }

  async listOffers(orgId: string, query: OfferListQueryDto) {
    const qb = this.offerLetterRepository
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.application', 'app')
      .leftJoinAndSelect('o.letterTemplate', 't')
      .where('o.organization_id = :orgId', { orgId })
      .orderBy('o.created_at', 'DESC');
    if (query.status) qb.andWhere('o.offer_status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere('(app.name ILIKE :s OR app.application_no ILIKE :s OR o.program_offered ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    const offers = await qb.getMany();
    const acceptances = offers.length
      ? await this.acceptanceRepository.find({ where: { offerLetterId: In(offers.map((o) => o.id)) } })
      : [];
    const byOffer = new Map(acceptances.map((a) => [a.offerLetterId, a]));
    return offers.map((o) => ({
      ...o,
      offerLetterHtml: undefined,
      application: undefined,
      applicationNo: o.application?.applicationNo,
      applicantName: o.application?.name,
      applicantEmail: o.application?.email,
      templateName: o.letterTemplate?.name ?? null,
      letterTemplate: undefined,
      acceptanceStatus: byOffer.get(o.id)?.acceptanceStatus ?? null,
      enrollmentStatus: byOffer.get(o.id)?.enrollmentStatus ?? null,
      feePaymentStatus: byOffer.get(o.id)?.feePaymentStatus ?? null,
    }));
  }

  private async mergeValues(application: Application, offer: Partial<OfferLetter>) {
    const orgName = await this.support.organizationName(application.organizationId);
    const settings = await this.support.getSettings(application.organizationId);
    const fee = await this.support.seatBookingFee(application.organizationId);
    let deadline = addDays(settings.acceptanceWindowDays || 15);
    const valid = dateOnly(offer.offerValidTill as any);
    if (valid && valid < deadline) deadline = valid;
    return {
      Name: application.name,
      Program: offer.programOffered || application.program || '',
      Scholarship_Amount: formatMoney(offer.scholarshipAmount),
      Offer_Valid_Till: formatLetterDate(offer.offerValidTill as any),
      Conditions: offer.conditions?.trim() ? offer.conditions : 'None',
      Application_No: application.applicationNo,
      Date: formatLetterDate(new Date()),
      Offer_Type: OFFER_TYPE_LABELS[offer.offerType || ''] || offer.offerType || '',
      Acceptance_Deadline: formatLetterDate(deadline),
      Seat_Booking_Fee: formatMoney(fee),
      Organization: orgName,
    };
  }

  // Core generation used by staff and by waitlist movement.
  async generateFor(
    application: Application,
    decision: AdmissionDecision | null,
    params: OfferParams,
    actorId: string | null,
    fromWaitlist = false,
  ): Promise<OfferLetter> {
    const orgId = application.organizationId;
    let offer = await this.findCurrentOffer(orgId, application.id);
    if (offer && offer.offerStatus === 'sent') {
      const acc = await this.acceptanceService.findForOffer(offer.id);
      if (!acc || acc.acceptanceStatus === AcceptanceStatus.PENDING || acc.acceptanceStatus === AcceptanceStatus.ACCEPTED) {
        throw new BadRequestException('An offer has already been sent to this candidate. Withdraw it before generating a new one.');
      }
    }
    if (!offer || !['draft', 'generated'].includes(offer.offerStatus)) {
      offer = this.offerLetterRepository.create({
        organizationId: orgId,
        applicationId: application.id,
        createdBy: actorId as string,
      });
    }

    const settings = await this.support.getSettings(orgId);
    const template = await this.templates.resolve(orgId, 'offer', params.letterTemplateId);
    const validTill = params.offerValidTill || addDays(settings.offerValidityDays || 15);
    if (validTill < todayStr()) throw new BadRequestException('Offer Valid Till cannot be in the past.');

    offer.admissionDecisionId = decision?.id ?? offer.admissionDecisionId ?? null;
    offer.offerType = params.offerType;
    offer.programOffered = params.programOffered || application.program || null;
    offer.offerValidTill = validTill;
    offer.scholarshipAmount = Number(params.scholarshipAmount ?? 0);
    offer.conditions = params.conditions ?? offer.conditions ?? null;
    offer.letterTemplateId = template.id;
    offer.letterTemplateVersion = template.version;
    offer.fromWaitlist = fromWaitlist || offer.fromWaitlist || false;

    const values = await this.mergeValues(application, offer);
    offer.offerLetterHtml = this.templates.render(template.bodyHtml, values);
    offer.offerStatus = 'generated';
    offer.offerGeneratedOn = new Date();
    offer.statusChangedAt = new Date();
    offer.generatedBy = actorId;
    offer.updatedBy = actorId as string;
    offer.sentToCandidate = false;
    offer.sentAt = null;
    offer = await this.offerLetterRepository.save(offer);

    const buffer = await this.pdf.renderPdf(offer.offerLetterHtml || '', {
      title: `Offer Letter ${application.applicationNo}`,
      organizationName: values.Organization,
    });
    const rel = await this.pdf.save(orgId, 'offer', offer.id, buffer);
    offer.offerLetterPdfPath = rel;
    offer.offerLetterPdfName = `Offer-Letter-${application.applicationNo.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;
    offer.offerLetterPdf = this.pdfUrl(offer);
    await this.offerLetterRepository.update(offer.id, {
      offerLetterPdfPath: rel,
      offerLetterPdfName: offer.offerLetterPdfName,
      offerLetterPdf: offer.offerLetterPdf,
    });
    return offer;
  }

  private async currentDecision(orgId: string, applicationId: string) {
    return this.decisionRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  async generateOfferLetter(orgId: string, applicationNo: string, dto: GenerateOfferLetterDto, actorId: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    const decision = await this.currentDecision(orgId, application.id);
    if (!decision || decision.finalDecision !== 'offer_made' || decision.approvalStatus !== 'approved') {
      throw new BadRequestException('An offer letter can be generated only after the decision "Offer Made" is approved.');
    }
    const offer = await this.generateFor(application, decision, dto, actorId);
    if (dto.send) return this.sendOffer(offer.id, actorId, true);
    return this.offerLetterRepository.findOne({ where: { id: offer.id } });
  }

  async sendOfferLetter(orgId: string, applicationNo: string, actorId: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    const offer = await this.findCurrentOffer(orgId, application.id);
    if (!offer) throw new NotFoundException('No offer letter exists for this application yet. Generate one first.');
    return this.sendOffer(offer.id, actorId, true);
  }

  // strict = true: a failed email is an error (staff action). strict = false
  // (automatic waitlist movement): the offer is still released in the portal.
  async sendOffer(offerId: string, actorId: string | null, strict: boolean) {
    const offer = await this.offerLetterRepository
      .createQueryBuilder('o')
      .addSelect('o.offerLetterPdfPath')
      .where('o.id = :id', { id: offerId })
      .getOne();
    if (!offer) throw new NotFoundException('Offer letter not found');
    if (offer.offerStatus === 'draft') throw new BadRequestException('Offer letter must be generated before it can be sent.');
    if (offer.offerStatus !== 'generated') {
      throw new BadRequestException(`Offer letter is ${offer.offerStatus} and cannot be sent.`);
    }
    const application = await this.support.findApplicationById(offer.applicationId);
    if (!application) throw new NotFoundException('Application not found');

    const decision = await this.currentDecision(offer.organizationId, application.id);
    if (!offer.fromWaitlist && decision && decision.decisionStage !== 'decision_released') {
      throw new BadRequestException('Release the decision before sending the offer letter.');
    }

    const template = offer.letterTemplateId
      ? await this.templates.get(offer.organizationId, offer.letterTemplateId).catch(() => null)
      : null;
    const values = await this.mergeValues(application, offer);
    const subject = this.templates.renderText(template?.subject || 'Offer of Admission - {{Application_No}}', values);
    const attachment = offer.offerLetterPdfPath ? await this.pdf.read(offer.offerLetterPdfPath).catch(() => null) : null;
    const portal = this.support.portalUrl('/results');
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1f2937;">
        <p>Dear ${escapeHtml(values.Name)},</p>
        <p>Your offer letter for application <strong>${application.applicationNo}</strong> is attached as a PDF.
        ${portal ? `You can accept or decline the offer and pay the seat booking fee in the <a href="${portal}">applicant portal</a>.` : ''}</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        ${offer.offerLetterHtml || ''}
      </div>`;
    const emailed = await this.pdf.sendWithAttachment({
      organizationId: offer.organizationId,
      to: application.email,
      subject,
      html,
      attachments: attachment ? [{ filename: offer.offerLetterPdfName || 'Offer-Letter.pdf', content: attachment }] : [],
    });
    if (!emailed && strict) {
      throw new BadRequestException('The offer letter email could not be sent. Check the email (SMTP) settings and try again.');
    }

    offer.offerStatus = 'sent';
    offer.sentToCandidate = emailed;
    offer.sentAt = new Date();
    offer.statusChangedAt = new Date();
    offer.updatedBy = actorId as string;
    await this.offerLetterRepository.update(offer.id, {
      offerStatus: 'sent',
      sentToCandidate: emailed,
      sentAt: offer.sentAt,
      statusChangedAt: offer.statusChangedAt,
      updatedBy: actorId as string,
    });

    await this.acceptanceService.createAcceptanceRecord(offer.id, actorId ?? undefined);

    await this.support.notifyApplicant(application, {
      type: 'offer_sent',
      severity: 'success',
      title: 'You have received an offer of admission',
      body: `Your offer for ${offer.programOffered || application.program} is valid till ${formatLetterDate(offer.offerValidTill)}.`,
      relatedEntityId: offer.id,
    });

    return this.offerLetterRepository.findOne({ where: { id: offer.id } });
  }

  async withdrawOffer(orgId: string, applicationNo: string, actorId: string, reason?: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    const offer = await this.findCurrentOffer(orgId, application.id);
    if (!offer) throw new NotFoundException('No offer letter exists for this application yet.');
    if (['withdrawn', 'expired'].includes(offer.offerStatus)) {
      throw new BadRequestException(`This offer is already ${offer.offerStatus}.`);
    }
    const wasSent = offer.offerStatus === 'sent';
    offer.offerStatus = 'withdrawn';
    offer.withdrawnReason = reason ?? null;
    offer.statusChangedAt = new Date();
    offer.updatedBy = actorId;
    await this.offerLetterRepository.save(offer);

    const acceptance = await this.acceptanceService.findForOffer(offer.id);
    if (acceptance && acceptance.acceptanceStatus === AcceptanceStatus.PENDING) {
      await this.acceptanceRepository.update(acceptance.id, {
        acceptanceStatus: AcceptanceStatus.EXPIRED,
        enrollmentStatus: 'cancelled',
      });
    } else if (acceptance && acceptance.acceptanceStatus === AcceptanceStatus.ACCEPTED) {
      await this.acceptanceRepository.update(acceptance.id, { enrollmentStatus: 'cancelled' });
    }

    if (wasSent) {
      await this.support.notifyApplicant(application, {
        type: 'offer_withdrawn',
        severity: 'warning',
        title: 'Your offer has been withdrawn',
        body: reason || 'Please contact the admissions office for details.',
      });
      try {
        const waitlist = await this.waitlist();
        await waitlist.onSeatVacated(orgId, offer.programOffered || application.program, 'offer_withdrawn', application.id);
      } catch (err) {
        this.logger.error(`Waitlist movement after withdrawal failed: ${(err as Error).message}`);
      }
    }
    return offer;
  }

  // Cron: offers past Offer Valid Till expire (unless already accepted).
  async expireOffers(): Promise<number> {
    const overdue = await this.offerLetterRepository.find({
      where: { offerStatus: In(['generated', 'sent']), offerValidTill: LessThan(todayStr()) as any },
    });
    let count = 0;
    for (const offer of overdue) {
      const acceptance = await this.acceptanceService.findForOffer(offer.id);
      if (acceptance && acceptance.acceptanceStatus === AcceptanceStatus.ACCEPTED) continue;
      const wasSent = offer.offerStatus === 'sent';
      await this.offerLetterRepository.update(offer.id, { offerStatus: 'expired', statusChangedAt: new Date() });
      if (acceptance && acceptance.acceptanceStatus === AcceptanceStatus.PENDING) {
        await this.acceptanceRepository.update(acceptance.id, {
          acceptanceStatus: AcceptanceStatus.EXPIRED,
          enrollmentStatus: 'cancelled',
        });
      }
      count++;
      const application = await this.support.findApplicationById(offer.applicationId);
      if (!application) continue;
      await this.support.notifyStaff({
        organizationId: offer.organizationId,
        type: 'offer_expired',
        severity: 'warning',
        title: `Offer expired: ${application.name} (${application.applicationNo})`,
        body: `The offer for ${offer.programOffered || application.program} passed its valid-till date (${formatLetterDate(offer.offerValidTill)}).`,
        link: `/organization/decisions/${encodeURIComponent(application.applicationNo)}`,
        relatedEntityId: offer.id,
      });
      if (wasSent) {
        await this.support.notifyApplicant(application, {
          type: 'offer_expired',
          severity: 'warning',
          title: 'Your offer has expired',
          body: 'The offer passed its valid-till date.',
        });
        try {
          const waitlist = await this.waitlist();
          await waitlist.onSeatVacated(offer.organizationId, offer.programOffered || application.program, 'offer_expired', application.id);
        } catch (err) {
          this.logger.error(`Waitlist movement after offer expiry failed: ${(err as Error).message}`);
        }
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // PDF file (Offer Letter PDF field)
  // ---------------------------------------------------------------------------

  async getPdf(orgId: string, offerId: string, applicationId?: string) {
    const offer = await this.offerLetterRepository
      .createQueryBuilder('o')
      .addSelect('o.offerLetterPdfPath')
      .where('o.id = :id AND o.organization_id = :orgId', { id: offerId, orgId })
      .getOne();
    if (!offer || (applicationId && offer.applicationId !== applicationId)) {
      throw new NotFoundException('Offer letter not found');
    }
    const buffer = await this.pdf.read(offer.offerLetterPdfPath);
    return { buffer, filename: offer.offerLetterPdfName || 'Offer-Letter.pdf' };
  }

  async uploadPdf(orgId: string, offerId: string, file: { buffer: Buffer; originalname?: string; mimetype?: string }, actorId: string) {
    if (!file?.buffer?.length) throw new BadRequestException('No file uploaded.');
    const isPdf = file.mimetype === 'application/pdf' || file.buffer.subarray(0, 5).toString() === '%PDF-';
    if (!isPdf) throw new BadRequestException('Only PDF files can be uploaded.');
    const offer = await this.offerLetterRepository.findOne({ where: { id: offerId, organizationId: orgId } });
    if (!offer) throw new NotFoundException('Offer letter not found');
    if (['withdrawn', 'expired'].includes(offer.offerStatus)) {
      throw new BadRequestException(`This offer is ${offer.offerStatus}.`);
    }
    const rel = await this.pdf.save(orgId, 'offer-upload', offer.id, file.buffer);
    const name = (file.originalname || 'Offer-Letter.pdf').replace(/[^A-Za-z0-9._-]/g, '_');
    await this.offerLetterRepository.update(offer.id, {
      offerLetterPdfPath: rel,
      offerLetterPdfName: name,
      offerLetterPdf: this.pdfUrl(offer),
      offerStatus: offer.offerStatus === 'draft' ? 'generated' : offer.offerStatus,
      offerGeneratedOn: offer.offerGeneratedOn ?? new Date(),
      updatedBy: actorId,
    });
    return this.offerLetterRepository.findOne({ where: { id: offer.id } });
  }
}
