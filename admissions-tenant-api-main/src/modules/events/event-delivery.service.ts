import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AnnouncementEvent } from './entities/event.entity.js';
import { CommunicationLog } from '../communications/entities/communication-log.entity.js';
import { InAppNotificationsService, NotifyInput } from '../in-app-notifications/in-app-notifications.service.js';
import { MailerService } from '../notifications/mailer.service.js';
import { MessagingService } from '../messaging/messaging.service.js';

export const STAFF_ROLES = ['org_admin', 'lead_manager', 'counselor', 'application_manager', 'exam_manager'];

/** Old UI labels for lead stages → real leads.status values. */
const LEGACY_LEAD_STAGE: Record<string, string> = {
  new: 'unverified',
  contacted: 'working',
  interested: 'working',
};

export type RecipientKind = 'staff' | 'student' | 'lead' | 'applicant';

export interface Recipient {
  kind: RecipientKind;
  userId?: string | null;
  role?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  leadId?: string | null;
  applicationId?: string | null;
  applicationNo?: string | null;
}

export interface AudienceTargeting {
  targetAudience?: string[] | null;
  targetCourseId?: string | null;
  targetLeadStages?: string[] | null;
  targetLeadSources?: string[] | null;
  targetApplicationStatuses?: string[] | null;
  targetAcademicSession?: string | null;
  targetBranchIds?: string[] | null;
}

export interface ResolvedAudience {
  staffRoles: string[];
  staff: Recipient[];
  students: Recipient[];
  leads: Recipient[];
  applicants: Recipient[];
  /** Student portal accounts matching targeted leads / applicants (for in-app delivery) */
  portalUsers: Recipient[];
}

const escapeHtml = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Resolves the audience of an announcement / event across leads, applicants,
 * students and staff, and delivers it through in-app notifications, email and
 * WhatsApp. Every email / WhatsApp delivery is written to communication_logs,
 * so it shows in the communication history.
 */
@Injectable()
export class EventDeliveryService {
  private readonly logger = new Logger(EventDeliveryService.name);

  constructor(
    private readonly ds: DataSource,
    @InjectRepository(AnnouncementEvent)
    private readonly events: Repository<AnnouncementEvent>,
    @InjectRepository(CommunicationLog)
    private readonly commLogs: Repository<CommunicationLog>,
    private readonly notifications: InAppNotificationsService,
    private readonly mailer: MailerService,
    private readonly messaging: MessagingService,
  ) {}

  private async q(sql: string, params: any[], label: string): Promise<any[]> {
    try {
      return await this.ds.query(sql, params);
    } catch (err) {
      this.logger.warn(`Audience query "${label}" failed: ${(err as Error).message}`);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Audience
  // ─────────────────────────────────────────────────────────────────────────
  async resolveAudience(orgId: string, t: AudienceTargeting): Promise<ResolvedAudience> {
    const aud = (t.targetAudience || []).map((a) => String(a).toLowerCase());
    const everyone = aud.length === 0 || aud.includes('all');
    const staffRoles = everyone || aud.includes('staff') ? [...STAFF_ROLES] : STAFF_ROLES.filter((r) => aud.includes(r));
    const wantStudents = everyone || aud.includes('student');
    const wantLeads = aud.includes('lead');
    const wantApplicants = aud.includes('applicant');
    const branchIds = (t.targetBranchIds || []).filter(Boolean);
    const courseId = t.targetCourseId && t.targetCourseId !== 'all' ? t.targetCourseId : null;

    const result: ResolvedAudience = { staffRoles, staff: [], students: [], leads: [], applicants: [], portalUsers: [] };

    if (staffRoles.length) {
      const params: any[] = [orgId, staffRoles];
      let branchCond = '';
      if (branchIds.length) {
        params.push(branchIds);
        branchCond = `AND u.branch_id::text = ANY($3::text[])`;
      }
      const rows = await this.q(
        `SELECT u.id, u.name, u.email, u.phone, u.role::text AS role FROM users u
         WHERE u.organization_id::text = $1 AND u.role::text = ANY($2::text[]) AND u.is_active ${branchCond}`,
        params,
        'staff',
      );
      result.staff = rows.map((r) => ({ kind: 'staff', userId: r.id, role: r.role, name: r.name, email: r.email, phone: r.phone }));
    }

    if (wantStudents) {
      const params: any[] = [orgId];
      let courseCond = '';
      if (courseId) {
        params.push(courseId);
        courseCond = `AND EXISTS (SELECT 1 FROM applications a WHERE a.organization_id::text = $1
                        AND LOWER(a.email) = LOWER(u.email) AND a.course_id::text = $2)`;
      }
      const rows = await this.q(
        `SELECT u.id, u.name, u.email, u.phone FROM users u
         WHERE u.organization_id::text = $1 AND u.role::text = 'student' AND u.is_active ${courseCond}`,
        params,
        'students',
      );
      result.students = rows.map((r) => ({ kind: 'student', userId: r.id, role: 'student', name: r.name, email: r.email, phone: r.phone }));
    }

    if (wantLeads) {
      const params: any[] = [orgId];
      const cond: string[] = [`l.organization_id::text = $1`, `COALESCE(l.closure_reason, '') <> 'do_not_call'`];
      const stages = (t.targetLeadStages || [])
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean)
        .map((s) => LEGACY_LEAD_STAGE[s] || s);
      if (stages.length) {
        params.push(Array.from(new Set(stages)));
        cond.push(`LOWER(l.status) = ANY($${params.length}::text[])`);
      } else {
        cond.push(`l.status NOT IN ('disqualified', 'closed')`);
      }
      const sources = (t.targetLeadSources || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
      if (sources.length) {
        params.push(sources);
        cond.push(`LOWER(COALESCE(l.source, '')) = ANY($${params.length}::text[])`);
      }
      if (courseId) {
        params.push(courseId);
        cond.push(`l.course_id::text = $${params.length}`);
      }
      if (branchIds.length) {
        params.push(branchIds);
        cond.push(`l.branch_id::text = ANY($${params.length}::text[])`);
      }
      const rows = await this.q(
        `SELECT l.id, TRIM(CONCAT(l.first_name, ' ', l.last_name)) AS name, l.email, l.phone
         FROM leads l WHERE ${cond.join(' AND ')}`,
        params,
        'leads',
      );
      result.leads = rows.map((r) => ({ kind: 'lead', leadId: r.id, name: r.name || 'Applicant', email: r.email, phone: r.phone }));
    }

    if (wantApplicants) {
      const params: any[] = [orgId];
      const cond: string[] = [`a.organization_id::text = $1`];
      const statuses = (t.targetApplicationStatuses || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean);
      if (statuses.length) {
        params.push(statuses);
        cond.push(`LOWER(COALESCE(a.form_status, '')) = ANY($${params.length}::text[])`);
      }
      if (courseId) {
        params.push(courseId);
        cond.push(`a.course_id::text = $${params.length}`);
      }
      if (t.targetAcademicSession) {
        params.push(t.targetAcademicSession);
        cond.push(`a.academic_session = $${params.length}`);
      }
      if (branchIds.length) {
        params.push(branchIds);
        cond.push(`a.branch_id::text = ANY($${params.length}::text[])`);
      }
      const rows = await this.q(
        `SELECT a.id, a.application_no, a.name, a.email, a.primary_mobile AS phone, a.lead_id
         FROM applications a WHERE ${cond.join(' AND ')}`,
        params,
        'applicants',
      );
      result.applicants = rows.map((r) => ({
        kind: 'applicant',
        applicationId: r.id,
        applicationNo: r.application_no,
        leadId: r.lead_id,
        name: r.name,
        email: r.email,
        phone: r.phone,
      }));
    }

    // Student-portal accounts of the targeted leads / applicants (in-app delivery).
    const extEmails = Array.from(
      new Set(
        [...result.leads, ...result.applicants]
          .map((r) => (r.email || '').trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    if (extEmails.length) {
      const rows = await this.q(
        `SELECT u.id, u.name, u.email FROM users u
         WHERE u.organization_id::text = $1 AND u.role::text = 'student' AND LOWER(u.email) = ANY($2::text[])`,
        [orgId, extEmails],
        'portal users',
      );
      result.portalUsers = rows.map((r) => ({ kind: 'student', userId: r.id, role: 'student', name: r.name, email: r.email }));
    }

    return result;
  }

  async previewAudience(orgId: string, t: AudienceTargeting) {
    const a = await this.resolveAudience(orgId, t);
    const emails = new Set<string>();
    const phones = new Set<string>();
    [...a.staff, ...a.students, ...a.leads, ...a.applicants].forEach((r) => {
      if (r.email) emails.add(r.email.trim().toLowerCase());
      if (r.phone) phones.add(r.phone.replace(/\D/g, ''));
    });
    const byRole: Record<string, number> = {};
    a.staff.forEach((s) => (byRole[s.role || 'staff'] = (byRole[s.role || 'staff'] || 0) + 1));
    return {
      staff: a.staff.length,
      staffByRole: byRole,
      students: a.students.length,
      leads: a.leads.length,
      applicants: a.applicants.length,
      portalAccounts: a.portalUsers.length,
      uniqueEmails: emails.size,
      uniquePhones: phones.size,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delivery
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Resolve the audience now and deliver in the background.
   * Returns the audience counts immediately.
   */
  async deliver(
    event: AnnouncementEvent,
    reason: 'publish' | 'broadcast' | 'schedule',
  ): Promise<{ started: boolean; reason?: string; recipients?: Record<string, number>; channels?: Record<string, boolean> }> {
    if (!event.organizationId) {
      return { started: false, reason: 'Platform-wide announcements are not delivered per organization' };
    }
    const audience = await this.resolveAudience(event.organizationId, event);
    const preview = {
      staff: audience.staff.length,
      students: audience.students.length,
      leads: audience.leads.length,
      applicants: audience.applicants.length,
    };

    await this.events.update(event.id, {
      deliveryStatus: 'in_progress',
      deliveryStats: { ...(event.deliveryStats || {}), reason, recipients: preview, startedAt: new Date().toISOString() } as any,
    });

    // Fire and forget: email / WhatsApp to many recipients can take minutes.
    setImmediate(() => {
      this.runDelivery(event, audience, reason).catch((err) =>
        this.logger.error(`Delivery of "${event.title}" failed: ${(err as Error).message}`),
      );
    });

    return {
      started: true,
      recipients: preview,
      channels: {
        inApp: event.sendInAppNotification !== false,
        email: !!event.sendEmailBroadcast,
        whatsapp: !!event.sendWhatsapp,
      },
    };
  }

  private async runDelivery(event: AnnouncementEvent, audience: ResolvedAudience, reason: string) {
    const orgId = event.organizationId as string;
    const stats: Record<string, any> = {
      reason,
      recipients: {
        staff: audience.staff.length,
        students: audience.students.length,
        leads: audience.leads.length,
        applicants: audience.applicants.length,
      },
      inApp: 0,
      email: { sent: 0, failed: 0 },
      whatsapp: { sent: 0, failed: 0 },
      startedAt: new Date().toISOString(),
    };

    try {
      if (event.sendInAppNotification !== false) {
        stats.inApp = await this.deliverInApp(event, audience);
      }

      // External recipients de-duplicated by email / phone; staff and students included.
      const everyone: Recipient[] = [...audience.applicants, ...audience.leads, ...audience.students, ...audience.staff];

      if (event.sendEmailBroadcast) {
        const seen = new Set<string>();
        const list = everyone.filter((r) => {
          const e = (r.email || '').trim().toLowerCase();
          if (!e || !e.includes('@') || seen.has(e)) return false;
          seen.add(e);
          return true;
        });
        const template = await this.loadTemplate(event.emailTemplateId, orgId);
        await this.inBatches(list, 5, async (r) => {
          const ok = await this.sendEmail(event, r, template);
          if (ok) stats.email.sent++;
          else stats.email.failed++;
        });
      }

      if (event.sendWhatsapp) {
        const seen = new Set<string>();
        const list = everyone.filter((r) => {
          const p = (r.phone || '').replace(/\D/g, '');
          if (p.length < 8 || seen.has(p)) return false;
          seen.add(p);
          return true;
        });
        await this.inBatches(list, 5, async (r) => {
          const ok = await this.sendWhatsapp(event, r);
          if (ok) stats.whatsapp.sent++;
          else stats.whatsapp.failed++;
        });
      }

      stats.finishedAt = new Date().toISOString();
      await this.events.update(event.id, {
        deliveryStatus: 'completed',
        lastDeliveredAt: new Date(),
        deliveryStats: stats,
      });

      if (event.createdById) {
        await this.notifications.notify({
          organizationId: orgId,
          recipientUserId: event.createdById,
          module: 'announcements',
          type: 'announcement.delivered',
          severity: stats.email.failed || stats.whatsapp.failed ? 'warning' : 'success',
          title: `"${event.title}" delivered`,
          body: `In-app: ${stats.inApp} · Email sent: ${stats.email.sent}${stats.email.failed ? ` (failed ${stats.email.failed})` : ''} · WhatsApp sent: ${stats.whatsapp.sent}${stats.whatsapp.failed ? ` (failed ${stats.whatsapp.failed})` : ''}`,
          link: '/organization/events',
          relatedEntityId: event.id,
          metadata: stats,
        });
      }
    } catch (err) {
      stats.error = (err as Error).message;
      stats.finishedAt = new Date().toISOString();
      await this.events.update(event.id, { deliveryStatus: 'failed', deliveryStats: stats }).catch(() => undefined);
      throw err;
    }
  }

  private async deliverInApp(event: AnnouncementEvent, audience: ResolvedAudience): Promise<number> {
    const orgId = event.organizationId as string;
    const isEvent = event.type === 'event';
    const when = isEvent && event.eventStartDate ? ` · ${event.eventStartDate}${event.eventStartTime ? ' ' + event.eventStartTime : ''}` : '';
    const body = (event.description || '').replace(/\s+/g, ' ').trim().slice(0, 400) + when;
    const severity: NotifyInput['severity'] =
      event.priority === 'Urgent' ? 'critical' : event.priority === 'High' ? 'warning' : 'info';
    const base = {
      organizationId: orgId,
      module: 'announcements',
      type: isEvent ? 'event.published' : 'announcement.published',
      severity,
      title: `${isEvent ? 'Event' : 'Announcement'}: ${event.title}`,
      body: body || null,
      relatedEntityId: event.id,
      metadata: {
        eventId: event.id,
        category: event.category,
        priority: event.priority,
        posterUrl: event.posterUrl,
        attachmentUrl: event.attachmentUrl,
        eventStartDate: event.eventStartDate,
        eventStartTime: event.eventStartTime,
        venueType: event.venueType,
        venueLocation: event.venueLocation,
      },
    };

    const inputs: NotifyInput[] = [];
    const branchFiltered = (event.targetBranchIds || []).length > 0;

    // Staff: one broadcast row for the targeted roles, or per user when filtered by branch.
    if (branchFiltered) {
      audience.staff.forEach((s) =>
        inputs.push({ ...base, recipientUserId: s.userId, link: `/organization/notifications` }),
      );
    } else if (audience.staffRoles.length) {
      inputs.push({ ...base, recipientRole: audience.staffRoles.join(','), link: `/organization/notifications` });
    }

    // Students: role broadcast unless a program filter narrows them.
    const courseFiltered = !!event.targetCourseId && event.targetCourseId !== 'all';
    const studentIds = new Set<string>();
    if (audience.students.length) {
      if (courseFiltered) {
        audience.students.forEach((s) => s.userId && studentIds.add(s.userId));
      } else {
        inputs.push({ ...base, recipientRole: 'student', link: null });
      }
    }
    // Leads / applicants with a student-portal account.
    const roleBroadcastToStudents = audience.students.length > 0 && !courseFiltered;
    if (!roleBroadcastToStudents) {
      audience.portalUsers.forEach((u) => u.userId && studentIds.add(u.userId));
    }
    studentIds.forEach((id) => inputs.push({ ...base, recipientUserId: id, link: null }));

    return this.notifications.notifyMany(inputs);
  }

  private async loadTemplate(templateId: string | null, orgId: string): Promise<{ id: string; subject: string; body: string; footer: string | null } | null> {
    if (!templateId) return null;
    const rows = await this.q(
      `SELECT id, subject, body, footer FROM email_templates WHERE id::text = $1 AND (organization_id::text = $2 OR organization_id IS NULL) LIMIT 1`,
      [templateId, orgId],
      'email template',
    );
    return rows[0] || null;
  }

  private render(text: string, event: AnnouncementEvent, r: Recipient) {
    const vars: Record<string, string> = {
      name: r.name || '',
      student: r.name || '',
      applicant_name: r.name || '',
      application_no: r.applicationNo || '',
      title: event.title || '',
      event_title: event.title || '',
      date: event.eventStartDate || '',
      time: event.eventStartTime || '',
      venue: event.venueLocation || '',
      sender: event.createdByName || 'Admissions Team',
    };
    return String(text || '').replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}|\{([a-zA-Z_]+)\}/g, (m, a, b) => {
      const key = String(a || b).toLowerCase();
      return key in vars ? vars[key] : m;
    });
  }

  private buildEmail(event: AnnouncementEvent, r: Recipient, template: { subject: string; body: string; footer: string | null } | null) {
    const isEvent = event.type === 'event';
    const subject = template
      ? this.render(template.subject, event, r)
      : `${isEvent ? 'Event' : 'Announcement'}: ${event.title}`;
    const details: string[] = [];
    if (isEvent && event.eventStartDate) {
      details.push(
        `<p><strong>When:</strong> ${escapeHtml(event.eventStartDate)}${event.eventStartTime ? ' ' + escapeHtml(event.eventStartTime) : ''}${
          event.eventEndDate || event.eventEndTime
            ? ' – ' + escapeHtml([event.eventEndDate, event.eventEndTime].filter(Boolean).join(' '))
            : ''
        }</p>`,
      );
    }
    if (event.venueLocation) {
      const v = escapeHtml(event.venueLocation);
      details.push(
        `<p><strong>${event.venueType === 'virtual' ? 'Join link' : 'Venue'}:</strong> ${
          /^https?:\/\//i.test(event.venueLocation) ? `<a href="${v}">${v}</a>` : v
        }</p>`,
      );
    }
    const poster = event.posterUrl ? `<p><img src="${escapeHtml(event.posterUrl)}" alt="" style="max-width:100%;border-radius:8px" /></p>` : '';
    const attachment = event.attachmentUrl
      ? `<p><a href="${escapeHtml(event.attachmentUrl)}">${escapeHtml(event.attachmentName || 'Download attachment')}</a></p>`
      : '';
    const content = template
      ? this.render(template.body, event, r)
      : `<p>Dear ${escapeHtml(r.name || 'Applicant')},</p><div>${escapeHtml(event.description || '').replace(/\n/g, '<br/>')}</div>`;
    const footer = template?.footer ? `<div style="color:#64748b;font-size:12px">${this.render(template.footer, event, r)}</div>` : '';
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a">
      <h2 style="margin:0 0 12px">${escapeHtml(event.title)}</h2>
      ${poster}${content}${details.join('')}${attachment}
      <p style="margin-top:16px">Regards,<br/>${escapeHtml(event.createdByName || 'Admissions Team')}</p>${footer}</div>`;
    return { subject, html };
  }

  private async sendEmail(event: AnnouncementEvent, r: Recipient, template: { id: string; subject: string; body: string; footer: string | null } | null) {
    const { subject, html } = this.buildEmail(event, r, template);
    let ok = false;
    try {
      ok = await this.mailer.sendCustomEmail({
        to: r.email as string,
        subject,
        html,
        organizationId: event.organizationId as string,
        fromName: event.createdByName || undefined,
      });
    } catch (err) {
      this.logger.warn(`Announcement email to ${r.email} failed: ${(err as Error).message}`);
      ok = false;
    }
    await this.log(event, r, 'Email', subject, html, ok ? 'Sent' : 'Failed', null, template?.id || null);
    return ok;
  }

  private async sendWhatsapp(event: AnnouncementEvent, r: Recipient) {
    const isEvent = event.type === 'event';
    const lines = [
      `*${isEvent ? 'Event' : 'Announcement'}: ${event.title}*`,
      event.description ? event.description.trim().slice(0, 900) : '',
      isEvent && event.eventStartDate ? `When: ${event.eventStartDate}${event.eventStartTime ? ' ' + event.eventStartTime : ''}` : '',
      event.venueLocation ? `${event.venueType === 'virtual' ? 'Join' : 'Venue'}: ${event.venueLocation}` : '',
      `- ${event.createdByName || 'Admissions Team'}`,
    ].filter(Boolean);
    const body = lines.join('\n');
    const res = await this.messaging.send({
      organizationId: event.organizationId as string,
      channel: 'whatsapp',
      to: r.phone as string,
      body,
      messageType: 'Alert',
      mediaUrl: event.posterUrl || (event.attachmentType === 'pdf' ? event.attachmentUrl : null) || null,
      recipientName: r.name,
      applicationId: r.applicationId || null,
      leadId: r.leadId || null,
      triggerEvent: isEvent ? 'event.published' : 'announcement.published',
      priority: event.priority === 'Urgent' || event.priority === 'High' ? 'High' : 'Normal',
    });
    await this.log(
      event,
      r,
      'WhatsApp',
      `${isEvent ? 'Event' : 'Announcement'}: ${event.title}`,
      res.success ? body : `${body}\n\n[Not delivered: ${res.error || 'unknown error'}]`,
      res.success ? 'Sent' : 'Failed',
      res.providerMessageId || null,
      null,
    );
    return res.success;
  }

  private async log(
    event: AnnouncementEvent,
    r: Recipient,
    channel: string,
    subject: string,
    content: string,
    status: string,
    messageId: string | null,
    templateId: string | null,
  ) {
    try {
      await this.commLogs.save(
        this.commLogs.create({
          organizationId: event.organizationId,
          applicationNo: r.applicationNo || null,
          applicantName: r.name || null,
          recipientEmail: r.email || null,
          recipientPhone: r.phone || null,
          channel,
          category: event.type === 'event' ? 'Event' : 'Announcement',
          categoryId: null,
          templateId: templateId && /^[0-9a-f-]{36}$/i.test(templateId) ? templateId : null,
          subject: subject.slice(0, 500),
          content,
          footer: null,
          sender: (event.createdByName || 'Admissions Team').slice(0, 150),
          status,
          messageId: messageId ? String(messageId).slice(0, 150) : null,
        }),
      );
    } catch (err) {
      this.logger.warn(`Could not write communication log for ${r.email || r.phone}: ${(err as Error).message}`);
    }
  }

  private async inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
    for (let i = 0; i < items.length; i += size) {
      await Promise.all(items.slice(i, i + size).map((it) => fn(it).catch(() => undefined)));
    }
  }
}
