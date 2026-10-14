import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdmissionDecision } from './entities/admission-decision.entity.js';
import { OfferLetter } from './entities/offer-letter.entity.js';
import { OfferAcceptance } from './entities/offer-acceptance.entity.js';
import { WaitlistEntry } from './entities/waitlist-entry.entity.js';
import { Rejection } from './entities/rejection.entity.js';
import { LetterTemplate } from './entities/letter-template.entity.js';
import { DecisionCommitteeTeam } from './entities/decision-committee-team.entity.js';
import { DecisionSettings } from './entities/decision-settings.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { AcademicSession } from '../academic-sessions/entities/academic-session.entity.js';
import { AdmissionDecisionsService } from './admission-decisions.service.js';
import { AdmissionDecisionsController, OrgDecisionsController } from './admission-decisions.controller.js';
import { OfferLettersService } from './offer-letters.service.js';
import { OfferLettersController, OrgOfferLettersController } from './offer-letters.controller.js';
import { AcceptanceService } from './acceptance.service.js';
import { AcceptanceController, OrgAcceptancesController } from './acceptance.controller.js';
import { WaitlistService } from './waitlist.service.js';
import { WaitlistController, OrgWaitlistController } from './waitlist.controller.js';
import { RejectionService } from './rejection.service.js';
import { RejectionController, OrgRejectionsController } from './rejection.controller.js';
import { LetterTemplatesService } from './letter-templates.service.js';
import { LetterTemplatesController } from './letter-templates.controller.js';
import { LetterPdfService } from './letter-pdf.service.js';
import { DecisionSupportService } from './decision-support.service.js';
import { DecisionsSchedulerService } from './decisions-scheduler.service.js';
import { StudentResultsController } from './student-results.controller.js';
import { InterviewsModule } from '../interviews/interviews.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

// Admissions Decision & Offer Management:
//  Admission_Decisions (workflow engine), Offer_Letters (templates + PDF),
//  Offer_Acceptances, Waitlist_Management, Rejections, letter templates,
//  committee teams, per-org settings, expiry jobs and the student portal view.
// InAppNotificationsService is global and injected directly.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdmissionDecision,
      OfferLetter,
      OfferAcceptance,
      WaitlistEntry,
      Rejection,
      LetterTemplate,
      DecisionCommitteeTeam,
      DecisionSettings,
      Application,
      Organization,
      User,
      Course,
      AcademicSession,
    ]),
    InterviewsModule,
    NotificationsModule,
  ],
  controllers: [
    AdmissionDecisionsController,
    OrgDecisionsController,
    OfferLettersController,
    OrgOfferLettersController,
    AcceptanceController,
    OrgAcceptancesController,
    WaitlistController,
    OrgWaitlistController,
    RejectionController,
    OrgRejectionsController,
    LetterTemplatesController,
    StudentResultsController,
  ],
  providers: [
    DecisionSupportService,
    LetterTemplatesService,
    LetterPdfService,
    AdmissionDecisionsService,
    OfferLettersService,
    AcceptanceService,
    WaitlistService,
    RejectionService,
    DecisionsSchedulerService,
  ],
  exports: [AdmissionDecisionsService, OfferLettersService, AcceptanceService, WaitlistService, RejectionService],
})
export class AdmissionsDecisionsModule {}
