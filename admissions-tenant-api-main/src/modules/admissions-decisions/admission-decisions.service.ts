import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Not, Repository } from 'typeorm';
import { AdmissionDecision, CommitteeReview, DECISION_STAGES } from './entities/admission-decision.entity.js';
import { OfferLetter } from './entities/offer-letter.entity.js';
import { OfferAcceptance } from './entities/offer-acceptance.entity.js';
import { WaitlistEntry } from './entities/waitlist-entry.entity.js';
import { Rejection } from './entities/rejection.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { ScoringService } from '../interviews/scoring.service.js';
import { MailerService } from '../notifications/mailer.service.js';
import { Role } from '../../common/enums/roles.enum.js';
import {
  AdvanceStageDto,
  BulkDecisionDto,
  CommitteeReviewDto,
  DecisionListQueryDto,
  FinalizeDecisionDto,
  ReleaseDecisionDto,
  UnlockDecisionDto,
  UpdateDecisionDto,
} from './dto/decision.dto.js';
import { WaitlistService } from './waitlist.service.js';
import { RejectionService } from './rejection.service.js';
import { OfferLettersService } from './offer-letters.service.js';
import { Actor, DecisionSupportService } from './decision-support.service.js';

const STAGE_ORDER: string[] = [...DECISION_STAGES];
const STAGE_LABELS: Record<string, string> = {
  under_review: 'Under Review',
  committee_review: 'Committee Review',
  final_approval: 'Final Approval',
  decision_released: 'Decision Released',
};
const DECISION_LABELS: Record<string, string> = {
  offer_made: 'Offer Made',
  waitlisted: 'Waitlisted',
  rejected: 'Rejected',
};

// Admission_Decisions workflow engine.
//  Under Review      : record created, committee (users / teams) assigned, score & remarks edited.
//  Committee Review  : committee members record reviews (recommendation, score, comments);
//                      Decision Score = average of the review scores.
//  Final Approval    : an approver approves a Final Decision (or sends it back to the committee).
//  Decision Released : an approver releases it; the record is locked and the outcome flows
//                      into offers / waitlist / rejections. The applicant sees it only when
//                      Applicant Visible is ticked.
// Locked decisions cannot be changed (an org admin can unlock with a reason).
@Injectable()
export class AdmissionDecisionsService {
  private readonly logger = new Logger(AdmissionDecisionsService.name);

  constructor(
    @InjectRepository(AdmissionDecision)
    private readonly decisionRepository: Repository<AdmissionDecision>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(OfferLetter)
    private readonly offerRepository: Repository<OfferLetter>,
    @InjectRepository(OfferAcceptance)
    private readonly acceptanceRepository: Repository<OfferAcceptance>,
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepository: Repository<WaitlistEntry>,
    @InjectRepository(Rejection)
    private readonly rejectionRepository: Repository<Rejection>,
    private readonly scoringService: ScoringService,
    private readonly mailerService: MailerService,
    private readonly waitlistService: WaitlistService,
    private readonly rejectionService: RejectionService,
    private readonly offerLettersService: OfferLettersService,
    private readonly support: DecisionSupportService,
  ) {}

  private async findCurrentDecision(orgId: string, applicationId: string): Promise<AdmissionDecision | null> {
    return this.decisionRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  private async decisionOrThrow(orgId: string, applicationNo: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    const decision = await this.findCurrentDecision(orgId, application.id);
    if (!decision) throw new NotFoundException('No decision record exists for this application yet. Create one first.');
    return { application, decision };
  }

  private assertUnlocked(decision: AdmissionDecision) {
    if (decision.decisionLocked) {
      throw new BadRequestException('This decision is locked and cannot be changed.');
    }
  }

  private async assertApprover(orgId: string, actor: Actor) {
    if (!(await this.support.isApprover(orgId, actor))) {
      throw new ForbiddenException('Only approvers can approve, finalize or release decisions.');
    }
  }

  private async compositeScore(orgId: string, applicationNo: string): Promise<number | null> {
    try {
      const b = await this.scoringService.getCompositeScoreBreakdown(orgId, applicationNo);
      return b?.compositeScore ?? null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async listDecisions(orgId: string, query: DecisionListQueryDto) {
    const where: any = { organizationId: orgId, formStatus: Not(In(['incomplete', 'draft'])) };
    const applications = await this.applicationRepository.find({
      where: query.search
        ? [
            { ...where, name: ILike(`%${query.search}%`) },
            { ...where, applicationNo: ILike(`%${query.search}%`) },
            { ...where, email: ILike(`%${query.search}%`) },
          ]
        : where,
      order: { createdAt: 'DESC' },
    });
    const ids = applications.map((a) => a.id);
    const decisions = ids.length
      ? await this.decisionRepository.find({ where: { organizationId: orgId, applicationId: In(ids) }, order: { createdAt: 'ASC' } })
      : [];
    const latest = new Map<string, AdmissionDecision>();
    decisions.forEach((d) => latest.set(d.applicationId, d));

    let rows = applications.map((a) => ({
      applicationId: a.id,
      applicationNo: a.applicationNo,
      name: a.name,
      email: a.email,
      program: a.program,
      compositeScore: a.compositeScore ?? null,
      decision: latest.get(a.id) ?? null,
    }));
    if (query.stage) {
      rows = query.stage === 'not_started'
        ? rows.filter((r) => !r.decision)
        : rows.filter((r) => r.decision?.decisionStage === query.stage);
    }
    if (query.finalDecision) rows = rows.filter((r) => r.decision?.finalDecision === query.finalDecision);
    if (query.program) rows = rows.filter((r) => r.program === query.program);
    return rows;
  }

  async getDecision(orgId: string, applicationNo: string, actor: Actor) {
    const application = await this.support.findApplication(orgId, applicationNo);
    const decision = await this.findCurrentDecision(orgId, application.id);
    let scoreBreakdown: any = null;
    try {
      scoreBreakdown = await this.scoringService.getCompositeScoreBreakdown(orgId, applicationNo);
    } catch {
      scoreBreakdown = null;
    }
    const memberIds = decision
      ? await this.support.committeeMemberIds(orgId, decision.decisionCommittee, decision.decisionCommitteeTeamIds)
      : [];
    const isApprover = await this.support.isApprover(orgId, actor);
    const names = await this.support.userNames([
      ...memberIds,
      ...(decision?.approvedBy ? [decision.approvedBy] : []),
      ...(decision?.releasedBy ? [decision.releasedBy] : []),
    ]);
    return {
      decision,
      scoreBreakdown,
      committeeMemberIds: memberIds,
      userNames: names,
      permissions: {
        canReview: !!decision && decision.decisionStage === 'committee_review' && !decision.decisionLocked && (memberIds.includes(actor.sub) || isApprover),
        canApprove: isApprover,
        canUnlock: actor.role === Role.ORG_ADMIN || actor.role === Role.SUPERADMIN,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Under Review: create / edit
  // ---------------------------------------------------------------------------

  async createOrUpdateDecision(orgId: string, applicationNo: string, dto: UpdateDecisionDto, actor: Actor) {
    const application = await this.support.findApplication(orgId, applicationNo);
    let decision = await this.findCurrentDecision(orgId, application.id);
    if (decision) this.assertUnlocked(decision);

    if (!decision) {
      decision = this.decisionRepository.create({
        organizationId: orgId,
        applicationId: application.id,
        decisionStage: 'under_review',
        approvalStatus: 'pending',
        decisionScore: await this.compositeScore(orgId, applicationNo),
        createdBy: actor.sub,
      });
    }
    if (decision.decisionStage === 'decision_released' && (dto.decisionCommittee || dto.decisionCommitteeTeamIds || dto.decisionScore !== undefined)) {
      throw new BadRequestException('The committee and score cannot change after the decision is released.');
    }
    if (dto.decisionCommittee !== undefined) decision.decisionCommittee = dto.decisionCommittee;
    if (dto.decisionCommitteeTeamIds !== undefined) decision.decisionCommitteeTeamIds = dto.decisionCommitteeTeamIds;
    if (dto.decisionScore !== undefined) decision.decisionScore = dto.decisionScore;
    if (dto.internalRemarks !== undefined) decision.internalRemarks = dto.internalRemarks;
    const becameVisible = dto.applicantVisible === true && !decision.applicantVisible;
    if (dto.applicantVisible !== undefined) decision.applicantVisible = dto.applicantVisible;
    decision.updatedBy = actor.sub;
    const saved = await this.decisionRepository.save(decision);

    if (becameVisible && saved.decisionStage === 'decision_released') {
      await this.communicate(application, saved, actor.sub);
    }
    return saved;
  }

  // ---------------------------------------------------------------------------
  // Committee Review
  // ---------------------------------------------------------------------------

  async addReview(orgId: string, applicationNo: string, dto: CommitteeReviewDto, actor: Actor) {
    const { decision } = await this.decisionOrThrow(orgId, applicationNo);
    this.assertUnlocked(decision);
    if (decision.decisionStage !== 'committee_review') {
      throw new BadRequestException('Reviews can be recorded only during Committee Review.');
    }
    const members = await this.support.committeeMemberIds(orgId, decision.decisionCommittee, decision.decisionCommitteeTeamIds);
    if (!members.includes(actor.sub) && !(await this.support.isApprover(orgId, actor))) {
      throw new ForbiddenException('Only members of the decision committee can review this decision.');
    }
    const names = await this.support.userNames([actor.sub]);
    const review: CommitteeReview = {
      userId: actor.sub,
      userName: names[actor.sub],
      recommendation: dto.recommendation,
      score: dto.score ?? null,
      comments: dto.comments ?? null,
      reviewedAt: new Date().toISOString(),
    };
    const reviews = (decision.committeeReviews || []).filter((r) => r.userId !== actor.sub);
    reviews.push(review);
    decision.committeeReviews = reviews;
    const scored = reviews.filter((r) => typeof r.score === 'number');
    if (scored.length) {
      decision.decisionScore = Math.round((scored.reduce((s, r) => s + Number(r.score), 0) / scored.length) * 100) / 100;
    }
    decision.updatedBy = actor.sub;
    return this.decisionRepository.save(decision);
  }

  // ---------------------------------------------------------------------------
  // Stage progression
  // ---------------------------------------------------------------------------

  async advanceStage(orgId: string, applicationNo: string, dto: AdvanceStageDto, actor: Actor) {
    const { decision } = await this.decisionOrThrow(orgId, applicationNo);
    this.assertUnlocked(decision);
    const currentIndex = STAGE_ORDER.indexOf(decision.decisionStage);
    const targetIndex = STAGE_ORDER.indexOf(dto.decisionStage);
    if (targetIndex !== currentIndex + 1) {
      throw new BadRequestException(
        `Cannot move from ${STAGE_LABELS[decision.decisionStage]} to ${STAGE_LABELS[dto.decisionStage]}. Stages go in order: Under Review, Committee Review, Final Approval, Decision Released.`,
      );
    }
    if (dto.decisionStage === 'committee_review') {
      const members = await this.support.committeeMemberIds(orgId, decision.decisionCommittee, decision.decisionCommitteeTeamIds);
      if (!members.length) throw new BadRequestException('Assign a decision committee (users or teams) before Committee Review.');
    }
    if (dto.decisionStage === 'final_approval') {
      if (!(decision.committeeReviews || []).length) {
        throw new BadRequestException('At least one committee review is needed before Final Approval.');
      }
      decision.approvalStatus = 'pending';
    }
    decision.decisionStage = dto.decisionStage;
    decision.updatedBy = actor.sub;
    const saved = await this.decisionRepository.save(decision);
    if (dto.decisionStage === 'final_approval') {
      const app = await this.support.findApplication(orgId, applicationNo);
      await this.support.notifyStaff({
        organizationId: orgId,
        type: 'decision_awaiting_approval',
        title: `Decision awaiting approval: ${app.name} (${app.applicationNo})`,
        link: `/organization/decisions/${encodeURIComponent(applicationNo)}`,
        relatedEntityId: decision.id,
        userIds: (await this.support.getSettings(orgId)).approverUserIds,
      });
    }
    return saved;
  }

  // Final Approval: approver approves a Final Decision, or rejects (sends back).
  async finalizeDecision(orgId: string, applicationNo: string, dto: FinalizeDecisionDto, actor: Actor) {
    const { decision } = await this.decisionOrThrow(orgId, applicationNo);
    this.assertUnlocked(decision);
    await this.assertApprover(orgId, actor);
    if (decision.decisionStage !== 'final_approval') {
      throw new BadRequestException(`The decision must be at Final Approval (it is at ${STAGE_LABELS[decision.decisionStage]}).`);
    }
    if (dto.internalRemarks !== undefined) decision.internalRemarks = dto.internalRemarks;

    if (dto.approvalStatus === 'rejected') {
      decision.approvalStatus = 'rejected';
      decision.decisionStage = 'committee_review';
      decision.approvedBy = null;
      decision.updatedBy = actor.sub;
      return this.decisionRepository.save(decision);
    }
    if (!dto.finalDecision) throw new BadRequestException('Choose the final decision to approve.');
    decision.finalDecision = dto.finalDecision;
    decision.approvalStatus = 'approved';
    decision.approvedBy = actor.sub;
    decision.decisionDate = new Date();
    decision.updatedBy = actor.sub;
    return this.decisionRepository.save(decision);
  }

  // Decision Released: locks the record and applies the outcome.
  async releaseDecision(orgId: string, applicationNo: string, dto: ReleaseDecisionDto, actor: Actor) {
    const { application, decision } = await this.decisionOrThrow(orgId, applicationNo);
    this.assertUnlocked(decision);
    await this.assertApprover(orgId, actor);
    if (decision.decisionStage !== 'final_approval' || decision.approvalStatus !== 'approved' || !decision.finalDecision) {
      throw new BadRequestException('Only an approved decision at Final Approval can be released.');
    }
    decision.decisionStage = 'decision_released';
    decision.releasedAt = new Date();
    decision.releasedBy = actor.sub;
    decision.decisionDate = decision.decisionDate ?? new Date();
    decision.decisionLocked = dto.lock ?? true;
    decision.applicantVisible = dto.applicantVisible ?? true;
    decision.updatedBy = actor.sub;
    await this.decisionRepository.save(decision);

    // Outcome on the application and downstream records.
    if (decision.finalDecision === 'offer_made') {
      application.formStatus = 'accepted';
      application.updatedBy = actor.sub;
      await this.support.saveApplication(application);
    } else if (decision.finalDecision === 'rejected') {
      application.formStatus = 'rejected';
      application.updatedBy = actor.sub;
      await this.support.saveApplication(application);
      await this.rejectionService.createForDecision(application, actor.sub, false);
    } else if (decision.finalDecision === 'waitlisted') {
      await this.waitlistService.addToWaitlist(application, actor.sub, false);
    }

    await this.support.notifyStaff({
      organizationId: orgId,
      type: 'decision_released',
      severity: 'success',
      title: `Decision released: ${application.name} (${application.applicationNo}) - ${DECISION_LABELS[decision.finalDecision]}`,
      body: decision.applicantVisible ? 'The applicant can see this decision.' : 'Not yet visible to the applicant.',
      link: `/organization/decisions/${encodeURIComponent(applicationNo)}`,
      relatedEntityId: decision.id,
    });

    if (decision.applicantVisible) await this.communicate(application, decision, actor.sub);
    return this.findCurrentDecision(orgId, application.id);
  }

  // Makes a released decision visible to the applicant and sends the
  // communications. Allowed on a locked decision: it does not change the outcome.
  async publishDecision(orgId: string, applicationNo: string, actor: Actor) {
    const { application, decision } = await this.decisionOrThrow(orgId, applicationNo);
    await this.assertApprover(orgId, actor);
    if (decision.decisionStage !== 'decision_released') {
      throw new BadRequestException('Only a released decision can be shown to the applicant.');
    }
    if (!decision.applicantVisible) {
      decision.applicantVisible = true;
      decision.updatedBy = actor.sub;
      await this.decisionRepository.save(decision);
    }
    if (!decision.applicantNotifiedAt) await this.communicate(application, decision, actor.sub);
    return this.findCurrentDecision(orgId, application.id);
  }

  async lockDecision(orgId: string, applicationNo: string, actor: Actor) {
    const { decision } = await this.decisionOrThrow(orgId, applicationNo);
    await this.assertApprover(orgId, actor);
    decision.decisionLocked = true;
    decision.updatedBy = actor.sub;
    return this.decisionRepository.save(decision);
  }

  async unlockDecision(orgId: string, applicationNo: string, dto: UnlockDecisionDto, actor: Actor) {
    if (actor.role !== Role.ORG_ADMIN && actor.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Only an organization admin can unlock a decision.');
    }
    const { decision } = await this.decisionOrThrow(orgId, applicationNo);
    if (!decision.decisionLocked) return decision;
    decision.decisionLocked = false;
    const names = await this.support.userNames([actor.sub]);
    decision.internalRemarks = `${decision.internalRemarks ? decision.internalRemarks + '\n' : ''}[Unlocked by ${names[actor.sub] || actor.sub} on ${new Date().toISOString().slice(0, 10)}] ${dto.reason}`;
    decision.updatedBy = actor.sub;
    return this.decisionRepository.save(decision);
  }

  // Applicant communication for a released + visible decision.
  private async communicate(application: Application, decision: AdmissionDecision, actorId: string) {
    if (decision.applicantNotifiedAt) return;
    await this.mailerService.sendDecisionEmail(application, decision);

    if (decision.finalDecision === 'waitlisted') {
      const entry = await this.waitlistRepository.findOne({
        where: { organizationId: application.organizationId, applicationId: application.id },
        order: { createdAt: 'DESC' },
      });
      if (entry && !entry.communicationSent) await this.waitlistService.sendWaitlistLetter(entry, application);
    } else if (decision.finalDecision === 'rejected') {
      await this.rejectionService.createForDecision(application, actorId, true);
    } else if (decision.finalDecision === 'offer_made') {
      const settings = await this.support.getSettings(application.organizationId);
      if (settings.autoSendOfferOnRelease) {
        try {
          const offer = await this.offerLettersService.generateFor(application, decision, { offerType: 'regular' }, actorId);
          await this.offerLettersService.sendOffer(offer.id, actorId, false);
        } catch (err) {
          this.logger.error(`Automatic offer for ${application.applicationNo} failed: ${(err as Error).message}`);
        }
      }
    }

    await this.decisionRepository.update(decision.id, { applicantNotifiedAt: new Date() });
    await this.support.notifyApplicant(application, {
      type: 'decision_released',
      severity: decision.finalDecision === 'rejected' ? 'warning' : 'success',
      title: 'Your admission decision has been released',
      body: `Decision: ${DECISION_LABELS[decision.finalDecision || ''] || ''}. Open Results to see the details.`,
      relatedEntityId: decision.id,
    });
  }

  // ---------------------------------------------------------------------------
  // Bulk decisions
  // ---------------------------------------------------------------------------

  async bulk(orgId: string, dto: BulkDecisionDto, actor: Actor) {
    const results: { applicationNo: string; ok: boolean; error?: string }[] = [];
    for (const applicationNo of [...new Set(dto.applicationNos)]) {
      try {
        switch (dto.action) {
          case 'create':
          case 'assign_committee':
            await this.createOrUpdateDecision(orgId, applicationNo, {
              decisionCommittee: dto.decisionCommittee,
              decisionCommitteeTeamIds: dto.decisionCommitteeTeamIds,
              internalRemarks: dto.internalRemarks,
            }, actor);
            break;
          case 'advance': {
            const { decision } = await this.decisionOrThrow(orgId, applicationNo);
            const next = dto.decisionStage ?? STAGE_ORDER[STAGE_ORDER.indexOf(decision.decisionStage) + 1];
            if (next !== 'committee_review' && next !== 'final_approval') {
              throw new BadRequestException(`Cannot advance from ${STAGE_LABELS[decision.decisionStage]}.`);
            }
            await this.advanceStage(orgId, applicationNo, { decisionStage: next }, actor);
            break;
          }
          case 'finalize':
            await this.finalizeDecision(orgId, applicationNo, {
              approvalStatus: dto.approvalStatus ?? 'approved',
              finalDecision: dto.finalDecision,
              internalRemarks: dto.internalRemarks,
            }, actor);
            break;
          case 'release':
            await this.releaseDecision(orgId, applicationNo, { applicantVisible: dto.applicantVisible ?? true }, actor);
            break;
          case 'publish':
            await this.publishDecision(orgId, applicationNo, actor);
            break;
        }
        results.push({ applicationNo, ok: true });
      } catch (err: any) {
        results.push({ applicationNo, ok: false, error: err?.response?.message || err?.message || 'Failed' });
      }
    }
    return {
      total: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  // ---------------------------------------------------------------------------
  // Student portal view — only what the applicant may see.
  // ---------------------------------------------------------------------------

  async findStudentApplication(email: string, orgId?: string | null, applicationNo?: string) {
    const where: any = { email: ILike((email || '').trim()), formStatus: Not(In(['draft', 'incomplete'])) };
    if (orgId) where.organizationId = orgId;
    if (applicationNo) where.applicationNo = applicationNo;
    const application = await this.applicationRepository.findOne({ where, order: { createdAt: 'DESC' } });
    if (!application) throw new NotFoundException('No submitted application found for your account.');
    return application;
  }

  async getStudentResult(email: string, orgId?: string | null, applicationNo?: string) {
    const application = await this.findStudentApplication(email, orgId, applicationNo);
    const decision = await this.findCurrentDecision(application.organizationId, application.id);
    const visible = !!decision && decision.applicantVisible && decision.decisionStage === 'decision_released';
    const base = {
      applicationId: application.id,
      applicationNo: application.applicationNo,
      name: application.name,
      program: application.program,
      decisionReleased: visible,
    };
    if (!visible || !decision) {
      return { ...base, decision: null, offer: null, acceptance: null, waitlist: null, rejection: null };
    }

    const offer = await this.offerRepository.findOne({
      where: { organizationId: application.organizationId, applicationId: application.id, offerStatus: In(['sent', 'expired', 'withdrawn']) },
      order: { createdAt: 'DESC' },
    });
    const acceptance = offer
      ? await this.acceptanceRepository.findOne({ where: { offerLetterId: offer.id }, order: { createdAt: 'DESC' } })
      : null;
    const waitlist = await this.waitlistRepository.findOne({
      where: { organizationId: application.organizationId, applicationId: application.id },
      order: { createdAt: 'DESC' },
    });
    const rejection = decision.finalDecision === 'rejected'
      ? await this.rejectionRepository.findOne({
          where: { organizationId: application.organizationId, applicationId: application.id },
          order: { createdAt: 'DESC' },
        })
      : null;

    return {
      ...base,
      decision: {
        finalDecision: decision.finalDecision,
        decisionDate: decision.decisionDate,
        releasedAt: decision.releasedAt,
      },
      offer: offer
        ? {
            id: offer.id,
            offerNo: offer.offerNo,
            offerType: offer.offerType,
            programOffered: offer.programOffered,
            offerStatus: offer.offerStatus,
            offerGeneratedOn: offer.offerGeneratedOn,
            offerValidTill: offer.offerValidTill,
            scholarshipAmount: offer.scholarshipAmount,
            conditions: offer.conditions,
            hasPdf: !!offer.offerLetterPdf,
            offerLetterHtml: offer.offerLetterHtml,
          }
        : null,
      acceptance: acceptance
        ? {
            id: acceptance.id,
            acceptanceStatus: acceptance.acceptanceStatus,
            candidateConfirmationDate: acceptance.candidateConfirmationDate,
            acceptanceDeadline: acceptance.acceptanceDeadline,
            seatBookingFee: acceptance.seatBookingFee,
            feePaymentLink: acceptance.feePaymentLink,
            feePaymentStatus: acceptance.feePaymentStatus,
            paymentReferenceId: acceptance.paymentReferenceId,
            onboardingPackageSent: acceptance.onboardingPackageSent,
            onboardingInfo: acceptance.onboardingPackageSent ? acceptance.onboardingInfo : null,
            enrollmentStatus: acceptance.enrollmentStatus,
          }
        : null,
      waitlist: waitlist && decision.finalDecision !== 'rejected'
        ? {
            waitlistRank: waitlist.waitlistRank,
            waitlistStatus: waitlist.waitlistStatus,
            alternateProgramOffered: waitlist.alternateProgramOffered,
            offerReleased: waitlist.offerReleased,
          }
        : null,
      rejection: rejection
        ? {
            rejectionReason: rejection.rejectionReason,
            rejectionDate: rejection.rejectionDate,
            alternateOptionsSuggested: rejection.alternateOptionsSuggested,
            eligibleForReapply: rejection.eligibleForReapply,
            nextIntake: rejection.nextIntake,
            hasLetter: !!rejection.rejectionLetterPdf,
          }
        : null,
    };
  }
}
