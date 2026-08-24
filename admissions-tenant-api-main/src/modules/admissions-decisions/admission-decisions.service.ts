import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdmissionDecision } from './entities/admission-decision.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { ScoringService } from '../interviews/scoring.service.js';
import { MailerService } from '../notifications/mailer.service.js';
import { UpdateDecisionDto } from './dto/update-decision.dto.js';
import { AdvanceStageDto } from './dto/advance-stage.dto.js';
import { FinalizeDecisionDto } from './dto/finalize-decision.dto.js';
import { WaitlistService } from './waitlist.service.js';
import { RejectionService } from './rejection.service.js';

// Ordered stage progression — index also used to validate you can't skip
// backward or jump ahead via advanceStage.
const STAGE_ORDER = ['under_review', 'committee_review', 'final_approval', 'decision_released'];

@Injectable()
export class AdmissionDecisionsService {
  constructor(
    @InjectRepository(AdmissionDecision)
    private readonly decisionRepository: Repository<AdmissionDecision>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly scoringService: ScoringService,
    private readonly mailerService: MailerService,
    // Phase 6b — WaitlistService/RejectionService live in this same module
    // directory and don't depend back on AdmissionDecisionsService, so this
    // is a plain (non-circular) injection.
    private readonly waitlistService: WaitlistService,
    private readonly rejectionService: RejectionService,
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

  // Fetches the current (most recent) AdmissionDecision for an application,
  // if any — there is at most one non-locked decision in flight per
  // application at a time (enforced by createOrUpdateDecision never
  // creating a second row while an unlocked one exists).
  private async findCurrentDecision(orgId: string, applicationId: string): Promise<AdmissionDecision | null> {
    return this.decisionRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getDecision(orgId: string, applicationNo: string) {
    const application = await this.findApplication(orgId, applicationNo);
    const decision = await this.findCurrentDecision(orgId, application.id);
    const scoreBreakdown = await this.scoringService.getCompositeScoreBreakdown(orgId, applicationNo);
    return { decision, scoreBreakdown };
  }

  // Upserts the active decision for an application. Snapshots decisionScore
  // from ScoringService.getCompositeScoreBreakdown (never recomputed here —
  // Phase 5 scoring internals are off-limits) whenever a new decision row is
  // created.
  async createOrUpdateDecision(orgId: string, applicationNo: string, dto: UpdateDecisionDto, actorId: string) {
    const application = await this.findApplication(orgId, applicationNo);
    let decision = await this.findCurrentDecision(orgId, application.id);

    if (decision?.decisionLocked) {
      throw new BadRequestException('This decision is locked and can no longer be edited.');
    }

    if (!decision) {
      const breakdown = await this.scoringService.getCompositeScoreBreakdown(orgId, applicationNo);
      decision = this.decisionRepository.create({
        organizationId: orgId,
        applicationId: application.id,
        decisionScore: breakdown.compositeScore,
        createdBy: actorId,
      });
    }

    if (dto.decisionStage !== undefined) decision.decisionStage = dto.decisionStage;
    if (dto.decisionCommittee !== undefined) decision.decisionCommittee = dto.decisionCommittee;
    if (dto.internalRemarks !== undefined) decision.internalRemarks = dto.internalRemarks;
    if (dto.applicantVisible !== undefined) decision.applicantVisible = dto.applicantVisible;
    decision.updatedBy = actorId;

    return this.decisionRepository.save(decision);
  }

  // Simple forward-only stage progression. Can't skip stages, can't move
  // backward, and can't touch a locked (already-finalized) decision.
  async advanceStage(orgId: string, applicationNo: string, dto: AdvanceStageDto, actorId: string) {
    const application = await this.findApplication(orgId, applicationNo);
    const decision = await this.findCurrentDecision(orgId, application.id);
    if (!decision) {
      throw new NotFoundException('No decision record exists for this application yet. Create one first.');
    }
    if (decision.decisionLocked) {
      throw new BadRequestException('This decision is locked and can no longer be edited.');
    }

    const currentIndex = STAGE_ORDER.indexOf(decision.decisionStage);
    const targetIndex = STAGE_ORDER.indexOf(dto.decisionStage);
    if (targetIndex !== currentIndex + 1) {
      throw new BadRequestException(
        `Cannot advance from '${decision.decisionStage}' directly to '${dto.decisionStage}'. Stages must progress one at a time.`,
      );
    }

    decision.decisionStage = dto.decisionStage;
    decision.updatedBy = actorId;
    return this.decisionRepository.save(decision);
  }

  // Finalizes the decision: only allowed from 'final_approval'. Locks the
  // record, stamps approvedBy/decisionDate, and propagates the outcome onto
  // Application.
  //
  // formStatus mapping (formStatus's allowed values are the existing
  // incomplete/submitted/under_review/accepted/rejected set — see
  // ApplicationsService.mapStatusToFrontend; we deliberately do NOT invent a
  // new formStatus value):
  //   offer_made -> formStatus = 'accepted'   (an offer is an acceptance
  //                 outcome from the institution's side)
  //   rejected   -> formStatus = 'rejected'
  //   waitlisted -> formStatus left as-is; Application.waitlistStatus is set
  //                 instead, since formStatus has no 'waitlisted' value and
  //                 waitlistStatus already exists on the entity for exactly
  //                 this purpose.
  async finalizeDecision(orgId: string, applicationNo: string, dto: FinalizeDecisionDto, actorId: string) {
    const application = await this.findApplication(orgId, applicationNo);
    const decision = await this.findCurrentDecision(orgId, application.id);
    if (!decision) {
      throw new NotFoundException('No decision record exists for this application yet. Create one first.');
    }
    if (decision.decisionLocked) {
      throw new BadRequestException('This decision is already finalized and locked.');
    }
    if (decision.decisionStage !== 'final_approval') {
      throw new BadRequestException(
        `Decision must be in 'final_approval' stage before it can be finalized (currently '${decision.decisionStage}'). Use advance-stage first.`,
      );
    }

    decision.finalDecision = dto.finalDecision;
    decision.approvalStatus = 'approved';
    if (dto.internalRemarks !== undefined) decision.internalRemarks = dto.internalRemarks;
    decision.decisionDate = new Date();
    decision.approvedBy = actorId;
    decision.decisionStage = 'decision_released';
    decision.decisionLocked = true;
    decision.updatedBy = actorId;
    await this.decisionRepository.save(decision);

    if (dto.finalDecision === 'offer_made') {
      application.formStatus = 'accepted';
    } else if (dto.finalDecision === 'rejected') {
      application.formStatus = 'rejected';
    } else if (dto.finalDecision === 'waitlisted') {
      application.waitlistStatus = 'waitlisted';
    }
    application.updatedBy = actorId;
    await this.applicationRepository.save(application);

    // Fire-and-forget-ish, but awaited so failures are logged before the
    // request completes; MailerService itself catches/logs without
    // throwing, matching sendApplicationSubmittedEmail's pattern.
    await this.mailerService.sendDecisionEmail(application, decision);

    // Phase 6b — connect the decision outcome to the waitlist/rejection
    // pipeline modules. offer_made deliberately has no equivalent hook here
    // — its acceptance record is created later, from
    // OfferLettersService.sendOfferLetter once an offer letter is actually
    // sent (see AcceptanceService.createAcceptanceRecord).
    if (dto.finalDecision === 'waitlisted') {
      await this.waitlistService.addToWaitlist(orgId, applicationNo, {});
    } else if (dto.finalDecision === 'rejected') {
      // Default reason is 'other' — admin can refine detailedReason via
      // PATCH .../rejection afterward.
      await this.rejectionService.createRejectionRecord(orgId, applicationNo, {
        rejectionReason: 'other',
      });
    }

    return decision;
  }
}
