import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferLetter } from './entities/offer-letter.entity.js';
import { AdmissionDecision } from './entities/admission-decision.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { MailerService } from '../notifications/mailer.service.js';
import { GenerateOfferLetterDto } from './dto/generate-offer-letter.dto.js';
import { AcceptanceService } from './acceptance.service.js';

@Injectable()
export class OfferLettersService {
  constructor(
    @InjectRepository(OfferLetter)
    private readonly offerLetterRepository: Repository<OfferLetter>,
    @InjectRepository(AdmissionDecision)
    private readonly decisionRepository: Repository<AdmissionDecision>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly mailerService: MailerService,
    // Phase 6b — AcceptanceService lives in this same module directory and
    // doesn't depend back on OfferLettersService, so this is a plain
    // (non-circular) injection.
    private readonly acceptanceService: AcceptanceService,
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

  private async findCurrentOffer(orgId: string, applicationId: string): Promise<OfferLetter | null> {
    return this.offerLetterRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOfferLetter(orgId: string, applicationNo: string) {
    const application = await this.findApplication(orgId, applicationNo);
    return this.findCurrentOffer(orgId, application.id);
  }

  // Simple template-literal HTML renderer — see OfferLetter entity's
  // doc comment for why this stays HTML rather than a generated PDF.
  private renderOfferLetterHtml(
    application: Application,
    dto: GenerateOfferLetterDto,
    programOffered: string,
  ): string {
    const validTill = new Date(dto.offerValidTill).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const scholarshipRow = dto.scholarshipAmount
      ? `<p><strong>Scholarship Awarded:</strong> ₹${Number(dto.scholarshipAmount).toLocaleString('en-IN')}</p>`
      : '';
    const conditionsRow = dto.conditions
      ? `<p><strong>Conditions:</strong> ${dto.conditions}</p>`
      : '';

    return `
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 650px; margin: 0 auto; border: 1px solid #d1d5db; padding: 32px; color: #1f2937;">
        <div style="text-align:center; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="margin:0; font-size: 22px; letter-spacing: 1px;">OFFER OF ADMISSION</h1>
        </div>
        <p>Dear <strong>${application.name}</strong>,</p>
        <p>
          We are pleased to offer you admission (Application No. <strong>${application.applicationNo}</strong>)
          to the <strong>${programOffered || 'programme'}</strong> under a
          <strong>${dto.offerType}</strong> offer.
        </p>
        ${scholarshipRow}
        ${conditionsRow}
        <p><strong>This offer is valid till:</strong> ${validTill}</p>
        <p style="margin-top: 32px;">We look forward to welcoming you.</p>
        <p style="margin-top: 24px;">Sincerely,<br/>Admissions Committee</p>
      </div>
    `;
  }

  // Requires the application's current AdmissionDecision.finalDecision to
  // be 'offer_made' — offer letters only follow a locked, offer decision.
  async generateOfferLetter(orgId: string, applicationNo: string, dto: GenerateOfferLetterDto, actorId: string) {
    const application = await this.findApplication(orgId, applicationNo);
    const decision = await this.decisionRepository.findOne({
      where: { organizationId: orgId, applicationId: application.id },
      order: { createdAt: 'DESC' },
    });
    if (!decision || decision.finalDecision !== 'offer_made') {
      throw new BadRequestException('An offer letter can only be generated once the decision has finalDecision = offer_made.');
    }

    let offer = await this.findCurrentOffer(orgId, application.id);
    if (!offer || offer.offerStatus === 'withdrawn' || offer.offerStatus === 'expired') {
      offer = this.offerLetterRepository.create({
        organizationId: orgId,
        applicationId: application.id,
        admissionDecisionId: decision.id,
        createdBy: actorId,
      });
    }

    const programOffered = application.program || '';
    offer.offerType = dto.offerType;
    offer.programOffered = programOffered;
    offer.offerValidTill = new Date(dto.offerValidTill);
    offer.scholarshipAmount = dto.scholarshipAmount ?? 0;
    if (dto.conditions !== undefined) offer.conditions = dto.conditions;
    offer.offerLetterHtml = this.renderOfferLetterHtml(application, dto, programOffered);
    offer.offerStatus = 'generated';
    offer.offerGeneratedOn = new Date();
    offer.generatedBy = actorId;
    offer.updatedBy = actorId;

    return this.offerLetterRepository.save(offer);
  }

  async sendOfferLetter(orgId: string, applicationNo: string, actorId: string) {
    const application = await this.findApplication(orgId, applicationNo);
    const offer = await this.findCurrentOffer(orgId, application.id);
    if (!offer) {
      throw new NotFoundException('No offer letter exists for this application yet. Generate one first.');
    }
    if (offer.offerStatus === 'draft') {
      throw new BadRequestException('Offer letter must be generated before it can be sent.');
    }
    if (offer.offerStatus === 'withdrawn' || offer.offerStatus === 'expired') {
      throw new BadRequestException(`Offer letter is ${offer.offerStatus} and cannot be sent.`);
    }

    offer.offerStatus = 'sent';
    offer.sentToCandidate = true;
    offer.sentAt = new Date();
    offer.updatedBy = actorId;
    await this.offerLetterRepository.save(offer);

    await this.mailerService.sendOfferLetterEmail(application, offer);

    // Phase 6b — once the offer letter is actually sent, the candidate can
    // begin the acceptance flow (seat-booking-fee payment + accept/decline).
    await this.acceptanceService.createAcceptanceRecord(offer.id);

    return offer;
  }

  async withdrawOffer(orgId: string, applicationNo: string, actorId: string, reason?: string) {
    const application = await this.findApplication(orgId, applicationNo);
    const offer = await this.findCurrentOffer(orgId, application.id);
    if (!offer) {
      throw new NotFoundException('No offer letter exists for this application yet.');
    }

    offer.offerStatus = 'withdrawn';
    if (reason) {
      offer.conditions = `${offer.conditions ? offer.conditions + '\n\n' : ''}[Withdrawn] ${reason}`;
    }
    offer.updatedBy = actorId;
    return this.offerLetterRepository.save(offer);
  }
}
