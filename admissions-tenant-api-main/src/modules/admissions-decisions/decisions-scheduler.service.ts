import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { DataSource, EntitySubscriberInterface, UpdateEvent } from 'typeorm';
import { OfferLettersService } from './offer-letters.service.js';
import { AcceptanceService } from './acceptance.service.js';
import { OfferAcceptance } from './entities/offer-acceptance.entity.js';

// Background jobs for the offer workflow:
//  - hourly: expire offers past Offer Valid Till, expire acceptances past the
//    Acceptance Deadline (both move the waitlist);
//  - every 5 minutes: confirm enrollment for seat booking fees that were paid
//    (safety net for the entity listener below).
// The listener reacts at once when the payments module marks a seat booking
// fee as paid (OfferAcceptance.feePaymentStatus -> 'paid').
@Injectable()
export class DecisionsSchedulerService implements EntitySubscriberInterface<OfferAcceptance> {
  private readonly logger = new Logger(DecisionsSchedulerService.name);
  private running = false;

  constructor(
    private readonly offerLetters: OfferLettersService,
    private readonly acceptances: AcceptanceService,
    dataSource: DataSource,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return OfferAcceptance;
  }

  afterUpdate(event: UpdateEvent<OfferAcceptance>) {
    const entity = event.entity as OfferAcceptance | undefined;
    const before = event.databaseEntity as OfferAcceptance | undefined;
    if (!entity?.id || !before) return;
    const paidNow = entity.feePaymentStatus === 'paid' || entity.feePaymentStatus === 'waived';
    const paidBefore = before.feePaymentStatus === 'paid' || before.feePaymentStatus === 'waived';
    if (paidNow && !paidBefore) {
      setImmediate(() => {
        this.acceptances.onFeePaid(entity.id).catch((err) =>
          this.logger.error(`Enrollment confirmation after payment failed: ${(err as Error).message}`),
        );
      });
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireOffersAndAcceptances() {
    if (this.running) return;
    this.running = true;
    try {
      const offers = await this.offerLetters.expireOffers();
      const acceptances = await this.acceptances.expireOverdue();
      if (offers || acceptances) {
        this.logger.log(`Expired ${offers} offer(s) and ${acceptances} acceptance(s).`);
      }
    } catch (err) {
      this.logger.error(`Offer expiry job failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  @Interval(5 * 60 * 1000)
  async reconcilePayments() {
    try {
      await this.acceptances.reconcilePaidFees();
    } catch (err) {
      this.logger.error(`Seat booking fee reconciliation failed: ${(err as Error).message}`);
    }
  }
}
