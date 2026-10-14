import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentOrder } from './entities/payment-order.entity.js';
import { PaymentRefund } from './entities/payment-refund.entity.js';
import { PaymentGatewaySetting } from './entities/payment-gateway-setting.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { OfferAcceptance } from '../admissions-decisions/entities/offer-acceptance.entity.js';
import { OfferLetter } from '../admissions-decisions/entities/offer-letter.entity.js';
import { PaymentsService } from './payments.service.js';
import { PaymentGatewaysService } from './payment-gateways.service.js';
import { PaymentsController, PaymentsAdminController } from './payments.controller.js';
import { EmailTemplatesModule } from '../email-templates/email-templates.module.js';
import { ApplicationsModule } from '../applications/applications.module.js';
import { RemindersModule } from '../reminders/reminders.module.js';

// Imports OfferAcceptance/OfferLetter entities directly (not AdmissionsDecisionsModule)
// to avoid a circular module dependency between payments and admissions-decisions.
@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrder, PaymentRefund, PaymentGatewaySetting, Application, Organization, OfferAcceptance, OfferLetter]),
    EmailTemplatesModule,
    ApplicationsModule,
    RemindersModule,
  ],
  controllers: [PaymentsController, PaymentsAdminController],
  providers: [PaymentsService, PaymentGatewaysService],
  exports: [PaymentsService, PaymentGatewaysService],
})
export class PaymentsModule {}
