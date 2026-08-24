import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentOrder } from './entities/payment-order.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { OfferAcceptance } from '../admissions-decisions/entities/offer-acceptance.entity.js';
import { OfferLetter } from '../admissions-decisions/entities/offer-letter.entity.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';

// Phase 6b — imports the OfferAcceptance/OfferLetter entities directly (via
// TypeOrmModule.forFeature) rather than importing AdmissionsDecisionsModule
// itself, avoiding a circular module dependency between payments and
// admissions-decisions.
@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder, Application, Organization, OfferAcceptance, OfferLetter]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
