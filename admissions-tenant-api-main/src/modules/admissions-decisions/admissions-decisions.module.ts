import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionDecision } from './entities/admission-decision.entity.js';
import { OfferLetter } from './entities/offer-letter.entity.js';
import { OfferAcceptance } from './entities/offer-acceptance.entity.js';
import { WaitlistEntry } from './entities/waitlist-entry.entity.js';
import { Rejection } from './entities/rejection.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { AdmissionDecisionsService } from './admission-decisions.service.js';
import { AdmissionDecisionsController } from './admission-decisions.controller.js';
import { OfferLettersService } from './offer-letters.service.js';
import { OfferLettersController } from './offer-letters.controller.js';
import { AcceptanceService } from './acceptance.service.js';
import { AcceptanceController } from './acceptance.controller.js';
import { WaitlistService } from './waitlist.service.js';
import { WaitlistController, OrgWaitlistController } from './waitlist.controller.js';
import { RejectionService } from './rejection.service.js';
import { RejectionController } from './rejection.controller.js';
import { InterviewsModule } from '../interviews/interviews.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

// Phase 6a — Admission Decisions + Offer Letters. Conceptually a new
// pipeline stage (post-interview, post-composite-score), so it lives in its
// own module rather than being folded into InterviewsModule. Imports
// InterviewsModule to reuse its exported ScoringService (read-only —
// getCompositeScoreBreakdown) and NotificationsModule for MailerService.
//
// Phase 6b — extends this same module with Offer Acceptances, Waitlist
// Management, and Rejections (see acceptance/waitlist/rejection
// service+controller files). AcceptanceService/WaitlistService/
// RejectionService are plain providers alongside AdmissionDecisionsService/
// OfferLettersService — no forwardRef needed since none of them depend back
// on AdmissionDecisionsService or OfferLettersService (only the reverse).
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdmissionDecision,
      OfferLetter,
      OfferAcceptance,
      WaitlistEntry,
      Rejection,
      Application,
      Organization,
    ]),
    InterviewsModule,
    NotificationsModule,
  ],
  controllers: [
    AdmissionDecisionsController,
    OfferLettersController,
    AcceptanceController,
    WaitlistController,
    OrgWaitlistController,
    RejectionController,
  ],
  providers: [
    AdmissionDecisionsService,
    OfferLettersService,
    AcceptanceService,
    WaitlistService,
    RejectionService,
  ],
  exports: [AdmissionDecisionsService, OfferLettersService, AcceptanceService, WaitlistService, RejectionService],
})
export class AdmissionsDecisionsModule {}
