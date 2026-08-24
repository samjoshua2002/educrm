import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferAcceptance, AcceptanceStatus } from './entities/offer-acceptance.entity.js';
import { OfferLetter } from './entities/offer-letter.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { MailerService } from '../notifications/mailer.service.js';
import { MarkOnboardingDto } from './dto/mark-onboarding.dto.js';
import { RecordAcceptanceDto } from './dto/record-acceptance.dto.js';

const DEFAULT_SEAT_BOOKING_FEE = 5000;

// Phase 6b — Offer Acceptances. One OfferAcceptance per OfferLetter,
// created automatically when the offer letter is sent (see
// OfferLettersService.sendOfferLetter -> createAcceptanceRecord). Tracks the
// candidate's seat-booking-fee payment (via PaymentsService.createSeatBookingOrder
// / markPaid, see payments module) and their final accept/decline decision.
@Injectable()
export class AcceptanceService {
  constructor(
    @InjectRepository(OfferAcceptance)
    private readonly acceptanceRepository: Repository<OfferAcceptance>,
    @InjectRepository(OfferLetter)
    private readonly offerLetterRepository: Repository<OfferLetter>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
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

  private async findCurrentOffer(orgId: string, applicationId: string): Promise<OfferLetter | null> {
    return this.offerLetterRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  // Resolves {application, offer, acceptance} for a given org+applicationNo,
  // throwing NotFoundException at whichever step is missing.
  private async findAcceptanceContext(orgId: string, applicationNo: string) {
    const application = await this.findApplication(orgId, applicationNo);
    const offer = await this.findCurrentOffer(orgId, application.id);
    if (!offer) {
      throw new NotFoundException('No offer letter exists for this application yet.');
    }
    const acceptance = await this.acceptanceRepository.findOne({
      where: { offerLetterId: offer.id },
      order: { createdAt: 'DESC' },
    });
    if (!acceptance) {
      throw new NotFoundException('No acceptance record exists for this application yet. It is created automatically once the offer letter is sent.');
    }
    return { application, offer, acceptance };
  }

  // Called from OfferLettersService.sendOfferLetter once an offer letter is
  // marked sent. Idempotent — a re-send of an already-accepted-track offer
  // letter won't clobber an in-progress acceptance.
  async createAcceptanceRecord(offerLetterId: string): Promise<OfferAcceptance> {
    const existing = await this.acceptanceRepository.findOne({
      where: { offerLetterId },
      order: { createdAt: 'DESC' },
    });
    if (existing) {
      return existing;
    }

    const offer = await this.offerLetterRepository.findOne({ where: { id: offerLetterId } });
    if (!offer) {
      throw new NotFoundException(`Offer letter ${offerLetterId} not found`);
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: offer.organizationId },
    });
    const seatBookingFee =
      organization?.settings?.seatBookingFee ?? DEFAULT_SEAT_BOOKING_FEE;

    const acceptance = this.acceptanceRepository.create({
      offerLetterId: offer.id,
      seatBookingFee,
      acceptanceDeadline: offer.offerValidTill,
      acceptanceStatus: AcceptanceStatus.PENDING,
    });
    return this.acceptanceRepository.save(acceptance);
  }

  async getAcceptance(orgId: string, applicationNo: string) {
    const { acceptance } = await this.findAcceptanceContext(orgId, applicationNo);
    return acceptance;
  }

  // Requires feePaymentStatus = 'paid' before accept=true can succeed — the
  // seat booking fee (via PaymentsService.createSeatBookingOrder /
  // /payments/razorpay/verify) must be paid first.
  async recordCandidateAcceptance(orgId: string, applicationNo: string, dto: RecordAcceptanceDto) {
    const { application, acceptance } = await this.findAcceptanceContext(orgId, applicationNo);

    if (dto.accept && acceptance.feePaymentStatus !== 'paid') {
      throw new BadRequestException(
        'The seat booking fee must be paid before the offer can be accepted.',
      );
    }

    acceptance.acceptanceStatus = dto.accept ? AcceptanceStatus.ACCEPTED : AcceptanceStatus.DECLINED;
    acceptance.candidateConfirmationDate = new Date();
    if (dto.accept) {
      acceptance.enrollmentStatus = 'confirmed';
    }
    await this.acceptanceRepository.save(acceptance);

    await this.mailerService.sendAcceptanceConfirmationEmail(application, acceptance);

    return acceptance;
  }

  async markOnboardingSent(orgId: string, applicationNo: string, dto: MarkOnboardingDto) {
    const { acceptance } = await this.findAcceptanceContext(orgId, applicationNo);
    acceptance.onboardingPackageSent = true;
    if (dto.onboardingInfo !== undefined) {
      acceptance.onboardingInfo = dto.onboardingInfo;
    }
    return this.acceptanceRepository.save(acceptance);
  }
}
