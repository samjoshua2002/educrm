import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Application } from '../applications/entities/application.entity.js';
import { AdmissionDecision } from '../admissions-decisions/entities/admission-decision.entity.js';
import { OfferLetter } from '../admissions-decisions/entities/offer-letter.entity.js';
import { OfferAcceptance } from '../admissions-decisions/entities/offer-acceptance.entity.js';
import { WaitlistEntry } from '../admissions-decisions/entities/waitlist-entry.entity.js';
import { Rejection } from '../admissions-decisions/entities/rejection.entity.js';
import { Interview } from '../interviews/entities/interview.entity.js';
import { InterviewSlot } from '../interviews/entities/interview-slot.entity.js';

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

  // Stage 1 — Shortlisting. Sent to each candidate promoted to
  // "Shortlisted" when an admin commits a Run Shortlisting result
  // (see ScoringService.commitShortlisting). Catch/log without throwing so
  // a mail hiccup never blocks the shortlisting commit.
  async sendShortlistedEmail(application: Application): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');
    const portalUrl = this.configService.get<string>('STUDENT_PORTAL_URL') || '#';
    const firstName = (application.name || '').trim().split(' ')[0] || 'Applicant';
    const programLabel = application.program || application.academicSession || '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">You've Been Shortlisted!</h2>
        <p>Dear ${firstName},</p>
        <p>
          Congratulations! Your application <strong>${application.applicationNo}</strong>
          ${programLabel ? `for <strong>${programLabel}</strong> ` : ''}has been
          <strong>shortlisted</strong> for the next stage of the admissions process.
        </p>
        <p>
          Our team will schedule your interview shortly. You will receive a separate
          email with the date, time, and venue (or online link) once it is confirmed.
          No action is needed from you right now.
        </p>
        <p style="margin: 24px 0;">
          <a href="${portalUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
            View your Student Portal
          </a>
        </p>
        <p>We look forward to meeting you.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: application.email,
        subject: `You've Been Shortlisted — ${application.applicationNo}`,
        html,
      });
      this.logger.log(
        `Shortlisted email sent to ${application.email} for ${application.applicationNo}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send shortlisted email to ${application.email}: ${error?.message || error}`,
      );
    }
  }

  // Stage 1 — Interview lifecycle. One email covering every status change
  // an admin makes on the GD & Interview screen: scheduled, rescheduled,
  // cancelled, marked no-show, or completed. Catch/log without throwing so
  // a mail hiccup never blocks the interview action.
  async sendInterviewStatusEmail(
    application: Application,
    interview: Interview,
    slot: InterviewSlot | null,
    event: 'Scheduled' | 'Rescheduled' | 'Cancelled' | 'No Show' | 'Completed',
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');
    const portalUrl = this.configService.get<string>('STUDENT_PORTAL_URL') || '#';
    const firstName = (application.name || '').trim().split(' ')[0] || 'Applicant';
    const typeLabel = interview.interviewType === 'GD' ? 'Group Discussion' : 'Personal Interview';

    const fmtTime = (d: Date) =>
      new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const fmtDate = (d: string | Date) =>
      new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const scheduleBlock =
      slot && (event === 'Scheduled' || event === 'Rescheduled')
        ? `
          <table style="margin:16px 0;border-collapse:collapse;">
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Type</td><td style="padding:4px 0;"><strong>${typeLabel}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Date</td><td style="padding:4px 0;"><strong>${fmtDate(slot.slotDate)}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Time</td><td style="padding:4px 0;"><strong>${fmtTime(slot.startTime)} – ${fmtTime(slot.endTime)}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Mode</td><td style="padding:4px 0;"><strong>${slot.mode === 'Virtual' ? 'Online' : 'In person'}</strong></td></tr>
            ${
              slot.mode === 'Virtual'
                ? slot.meetingLink
                  ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Link</td><td style="padding:4px 0;"><a href="${slot.meetingLink}">${slot.meetingLink}</a></td></tr>`
                  : ''
                : slot.location
                  ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Venue</td><td style="padding:4px 0;"><strong>${slot.location}</strong></td></tr>`
                  : ''
            }
          </table>`
        : '';

    const copy: Record<typeof event, { subject: string; heading: string; body: string }> = {
      Scheduled: {
        subject: `Interview Scheduled — ${application.applicationNo}`,
        heading: 'Your Interview is Scheduled',
        body: `Your ${typeLabel} for application <strong>${application.applicationNo}</strong> has been scheduled. Details are below — please be available a few minutes early.`,
      },
      Rescheduled: {
        subject: `Interview Rescheduled — ${application.applicationNo}`,
        heading: 'Your Interview has been Rescheduled',
        body: `Your ${typeLabel} for application <strong>${application.applicationNo}</strong> has been moved to a new slot. Please note the updated details below.`,
      },
      Cancelled: {
        subject: `Interview Cancelled — ${application.applicationNo}`,
        heading: 'Your Interview has been Cancelled',
        body: `Your ${typeLabel} for application <strong>${application.applicationNo}</strong> has been cancelled. Our team will be in touch if it needs to be rescheduled.`,
      },
      'No Show': {
        subject: `Interview Missed — ${application.applicationNo}`,
        heading: 'Interview Marked as Missed',
        body: `Our records show you did not attend your scheduled ${typeLabel} for application <strong>${application.applicationNo}</strong>. If you believe this is an error, please contact the admissions team as soon as possible.`,
      },
      Completed: {
        subject: `Interview Completed — ${application.applicationNo}`,
        heading: 'Interview Completed',
        body: `Thank you for attending your ${typeLabel} for application <strong>${application.applicationNo}</strong>. Your result will be communicated to you once the evaluation is finalised.`,
      },
    };

    const content = copy[event];
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">${content.heading}</h2>
        <p>Dear ${firstName},</p>
        <p>${content.body}</p>
        ${scheduleBlock}
        <p style="margin: 24px 0;">
          <a href="${portalUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
            View your Student Portal
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
      this.logger.log(
        `Interview ${event} email sent to ${application.email} for ${application.applicationNo}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send interview ${event} email to ${application.email}: ${error?.message || error}`,
      );
    }
  }

  async sendStudentVerificationOtpEmail(email: string, name: string, otp: string): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');
    const studentLoginUrl = 'http://localhost:3001/student-login';
    const firstName = (name || '').trim().split(' ')[0] || 'Student';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #111827;">Lead Verified Successfully</h2>
        <p>Dear ${firstName},</p>
        <p>
          Your details have been successfully verified. Your registered email is <strong>${email}</strong> and your One-Time Password (OTP) is <strong>${otp}</strong>.
        </p>
        <p style="margin: 24px 0;">
          <a href="${studentLoginUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
            Access your Student Portal
          </a>
        </p>
        <p>Thank you for applying. We will keep you updated on the next steps.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: `Welcome to EduCRM — Student Portal Credentials`,
        html,
      });
      this.logger.log(`Student verification OTP email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send student verification OTP email to ${email}: ${error?.message || error}`);
    }
  }

  async sendCustomEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    fromName?: string;
  }): Promise<boolean> {
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || 'admissions@educrm.com';
    const fromName = options.fromName || this.configService.get<string>('SMTP_FROM_NAME') || 'Admissions Desk';

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Custom email sent to ${options.to} (subject: "${options.subject}")`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send custom email to ${options.to}: ${error?.message || error}`);
      return false;
    }
  }
}

