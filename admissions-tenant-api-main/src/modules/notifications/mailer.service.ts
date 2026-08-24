import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Application } from '../applications/entities/application.entity.js';
import { AdmissionDecision } from '../admissions-decisions/entities/admission-decision.entity.js';
import { OfferLetter } from '../admissions-decisions/entities/offer-letter.entity.js';
import { OfferAcceptance } from '../admissions-decisions/entities/offer-acceptance.entity.js';
import { WaitlistEntry } from '../admissions-decisions/entities/waitlist-entry.entity.js';
import { Rejection } from '../admissions-decisions/entities/rejection.entity.js';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT')) || 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendApplicationSubmittedEmail(application: Application): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');
    const portalUrl = this.configService.get<string>('STUDENT_PORTAL_URL') || '#';
    const firstName = (application.name || '').trim().split(' ')[0] || 'Applicant';
    const programLabel = application.program || application.academicSession || '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">Application Submitted Successfully</h2>
        <p>Dear ${firstName},</p>
        <p>
          Your application <strong>${application.applicationNo}</strong>
          ${programLabel ? `for <strong>${programLabel}</strong> ` : ''}has been submitted successfully.
        </p>
        <p style="margin: 24px 0;">
          <a href="${portalUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
            Access your Student Portal
          </a>
        </p>
        <p>Thank you for applying. We will keep you updated on the next steps.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: application.email,
        subject: `Application Submitted Successfully — ${application.applicationNo}`,
        html,
      });
      this.logger.log(
        `Application submitted email sent to ${application.email} for ${application.applicationNo}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send application submitted email to ${application.email}: ${error?.message || error}`,
      );
    }
  }

  // Phase 6a — Admission Decisions. Generic "your application status has
  // been updated" notification, subject/body varying by finalDecision.
  // Follows sendApplicationSubmittedEmail's exact pattern: build html, try
  // send, catch/log without throwing so a mail-provider hiccup never blocks
  // the decision workflow itself.
  async sendDecisionEmail(application: Application, decision: AdmissionDecision): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');
    const portalUrl = this.configService.get<string>('STUDENT_PORTAL_URL') || '#';
    const firstName = (application.name || '').trim().split(' ')[0] || 'Applicant';

    const copy: Record<string, { subject: string; heading: string; body: string }> = {
      offer_made: {
        subject: `Congratulations! Offer Update — ${application.applicationNo}`,
        heading: 'Congratulations!',
        body: `We are pleased to inform you that an offer has been made for your application <strong>${application.applicationNo}</strong>. Please log in to your student portal for further details.`,
      },
      waitlisted: {
        subject: `Application Status Update — ${application.applicationNo}`,
        heading: 'Application Status Update',
        body: `Your application <strong>${application.applicationNo}</strong> has been placed on the waitlist. We will notify you if a seat becomes available.`,
      },
      rejected: {
        subject: `Application Status Update — ${application.applicationNo}`,
        heading: 'Application Status Update',
        body: `Thank you for your interest. After careful review, we are unable to offer you admission at this time for application <strong>${application.applicationNo}</strong>.`,
      },
    };

    const content = copy[decision.finalDecision] || {
      subject: `Application Status Update — ${application.applicationNo}`,
      heading: 'Application Status Update',
      body: `The status of your application <strong>${application.applicationNo}</strong> has been updated.`,
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">${content.heading}</h2>
        <p>Dear ${firstName},</p>
        <p>${content.body}</p>
        <p style="margin: 24px 0;">
          <a href="${portalUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
            Access your Student Portal
          </a>
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: application.email,
        subject: content.subject,
        html,
      });
      this.logger.log(`Decision email sent to ${application.email} for ${application.applicationNo}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send decision email to ${application.email}: ${error?.message || error}`,
      );
    }
  }

  // Phase 6a — Offer Letters. Inlines the rendered offer letter HTML body
  // directly into the email (see OfferLetter.offerLetterHtml doc comment —
  // there is no PDF attachment in this phase).
  async sendOfferLetterEmail(application: Application, offerLetter: OfferLetter): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');
    const firstName = (application.name || '').trim().split(' ')[0] || 'Applicant';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">Your Offer Letter</h2>
        <p>Dear ${firstName},</p>
        <p>Please find your offer letter for application <strong>${application.applicationNo}</strong> below.</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        ${offerLetter.offerLetterHtml || ''}
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: application.email,
        subject: `Your Offer Letter — ${application.applicationNo}`,
        html,
      });
      this.logger.log(`Offer letter email sent to ${application.email} for ${application.applicationNo}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send offer letter email to ${application.email}: ${error?.message || error}`,
      );
    }
  }

  // Phase 6b — Offer Acceptances. Confirms the candidate's accept/decline
  // decision recorded via AcceptanceService.recordCandidateAcceptance.
  async sendAcceptanceConfirmationEmail(application: Application, acceptance: OfferAcceptance): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');
    const firstName = (application.name || '').trim().split(' ')[0] || 'Applicant';
    const accepted = acceptance.acceptanceStatus === 'accepted';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">${accepted ? 'Admission Confirmed' : 'Offer Declined'}</h2>
        <p>Dear ${firstName},</p>
        <p>
          ${accepted
            ? `We are delighted to confirm your seat for application <strong>${application.applicationNo}</strong>. Onboarding details will follow shortly.`
            : `We have recorded that you have declined the offer for application <strong>${application.applicationNo}</strong>. We wish you the very best.`}
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: application.email,
        subject: `${accepted ? 'Admission Confirmed' : 'Offer Declined'} — ${application.applicationNo}`,
        html,
      });
      this.logger.log(`Acceptance confirmation email sent to ${application.email} for ${application.applicationNo}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send acceptance confirmation email to ${application.email}: ${error?.message || error}`,
      );
    }
  }

  // Phase 6b — Waitlist Management. Notifies a waitlisted candidate that a
  // seat has opened up (see WaitlistService.releaseOffer). The admin
  // separately follows up by generating a real OfferLetter.
  async sendWaitlistOfferReleasedEmail(application: Application, entry: WaitlistEntry): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');
    const firstName = (application.name || '').trim().split(' ')[0] || 'Applicant';
    const programLine = entry.alternateProgramOffered
      ? `<p>A seat has become available in <strong>${entry.alternateProgramOffered}</strong>.</p>`
      : `<p>A seat has become available for your original programme choice.</p>`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">Good News — A Seat Has Opened Up</h2>
        <p>Dear ${firstName},</p>
        ${programLine}
        <p>Your application <strong>${application.applicationNo}</strong> is being moved forward from the waitlist. Please watch for your offer letter and further instructions.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: application.email,
        subject: `A Seat Has Opened Up — ${application.applicationNo}`,
        html,
      });
      this.logger.log(`Waitlist offer-released email sent to ${application.email} for ${application.applicationNo}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send waitlist offer-released email to ${application.email}: ${error?.message || error}`,
      );
    }
  }

  // Phase 6b — Rejections. Follow-up email with the rejection detail and
  // any reapply guidance (see RejectionService.createRejectionRecord).
  async sendRejectionEmail(application: Application, rejection: Rejection): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');
    const firstName = (application.name || '').trim().split(' ')[0] || 'Applicant';
    const reapplyLine = rejection.eligibleForReapply
      ? `<p>You are welcome to reapply${rejection.nextIntake ? ` for our <strong>${rejection.nextIntake}</strong> intake` : ''}.</p>`
      : '';
    const alternateLine = rejection.alternateOptionsSuggested
      ? `<p><strong>Alternate options:</strong> ${rejection.alternateOptionsSuggested}</p>`
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">Application Status Update</h2>
        <p>Dear ${firstName},</p>
        <p>Thank you for your interest. After careful review, we are unable to offer you admission at this time for application <strong>${application.applicationNo}</strong>.</p>
        ${alternateLine}
        ${reapplyLine}
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: application.email,
        subject: `Application Status Update — ${application.applicationNo}`,
        html,
      });
      this.logger.log(`Rejection email sent to ${application.email} for ${application.applicationNo}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send rejection email to ${application.email}: ${error?.message || error}`,
      );
    }
  }
}
