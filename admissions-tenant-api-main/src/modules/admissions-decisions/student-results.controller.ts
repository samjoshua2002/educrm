import { BadRequestException, Body, Controller, Get, NotFoundException, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { Response } from 'express';
import { AdmissionDecisionsService } from './admission-decisions.service.js';
import { AcceptanceService } from './acceptance.service.js';
import { OfferLettersService } from './offer-letters.service.js';
import { RejectionService } from './rejection.service.js';
import { AdmissionDecision } from './entities/admission-decision.entity.js';
import { OfferLetter } from './entities/offer-letter.entity.js';
import { Rejection } from './entities/rejection.entity.js';
import { RecordAcceptanceDto } from './dto/acceptance.dto.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/roles.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { sendPdf } from './offer-letters.controller.js';

// Student portal: the applicant's own decision, offer, acceptance, waitlist
// and rejection — only once the decision is released AND Applicant Visible.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student/admission-result')
export class StudentResultsController {
  constructor(
    private readonly decisions: AdmissionDecisionsService,
    private readonly acceptances: AcceptanceService,
    private readonly offers: OfferLettersService,
    private readonly rejections: RejectionService,
    @InjectRepository(AdmissionDecision)
    private readonly decisionRepo: Repository<AdmissionDecision>,
    @InjectRepository(OfferLetter)
    private readonly offerRepo: Repository<OfferLetter>,
    @InjectRepository(Rejection)
    private readonly rejectionRepo: Repository<Rejection>,
  ) {}

  private async visibleDecision(req: any, applicationNo?: string) {
    const application = await this.decisions.findStudentApplication(req.user.email, req.user.organizationId, applicationNo);
    const decision = await this.decisionRepo.findOne({
      where: { organizationId: application.organizationId, applicationId: application.id },
      order: { createdAt: 'DESC' },
    });
    if (!decision || !decision.applicantVisible || decision.decisionStage !== 'decision_released') {
      throw new NotFoundException('Your admission decision has not been released yet.');
    }
    return { application, decision };
  }

  private async sentOffer(application: { id: string; organizationId: string }) {
    const offer = await this.offerRepo.findOne({
      where: { organizationId: application.organizationId, applicationId: application.id, offerStatus: In(['sent', 'expired', 'withdrawn']) },
      order: { createdAt: 'DESC' },
    });
    if (!offer) throw new NotFoundException('No offer letter has been sent to you yet.');
    return offer;
  }

  @Get()
  @Roles(Role.STUDENT)
  @ResponseMessage('Admission result fetched successfully')
  get(@Request() req, @Query('applicationNo') applicationNo?: string) {
    return this.decisions.getStudentResult(req.user.email, req.user.organizationId, applicationNo);
  }

  // Accept or decline the offer.
  @Post('respond')
  @Roles(Role.STUDENT)
  @ResponseMessage('Your response has been recorded')
  async respond(@Request() req, @Body() dto: RecordAcceptanceDto, @Query('applicationNo') applicationNo?: string) {
    const { application } = await this.visibleDecision(req, applicationNo);
    const offer = await this.sentOffer(application);
    const acceptance = await this.acceptances.findForOffer(offer.id);
    if (!acceptance) throw new BadRequestException('This offer cannot be answered yet.');
    return this.acceptances.respond(application, offer, acceptance, dto, req.user.sub);
  }

  @Get('offer-letter/pdf')
  @Roles(Role.STUDENT)
  async offerPdf(@Request() req, @Res() res: Response, @Query('applicationNo') applicationNo?: string) {
    const { application } = await this.visibleDecision(req, applicationNo);
    const offer = await this.sentOffer(application);
    const { buffer, filename } = await this.offers.getPdf(application.organizationId, offer.id, application.id);
    sendPdf(res, buffer, filename);
  }

  @Get('rejection-letter/pdf')
  @Roles(Role.STUDENT)
  async rejectionPdf(@Request() req, @Res() res: Response, @Query('applicationNo') applicationNo?: string) {
    const { application } = await this.visibleDecision(req, applicationNo);
    const rejection = await this.rejectionRepo.findOne({
      where: { organizationId: application.organizationId, applicationId: application.id },
      order: { createdAt: 'DESC' },
    });
    if (!rejection) throw new NotFoundException('No rejection letter found.');
    const { buffer, filename } = await this.rejections.getPdf(application.organizationId, rejection.id);
    sendPdf(res, buffer, filename);
  }
}
