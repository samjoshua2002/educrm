import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import { CommunicationLog } from './entities/communication-log.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { User } from '../users/entities/user.entity.js';

/** One entry of the per-applicant communication timeline (scope §5). */
export interface TimelineEntry {
  interactionId: string;
  applicantId: string | null;
  leadId: string | null;
  applicationNo: string | null;
  applicantName: string | null;
  channel: string; // Email / SMS / WhatsApp / Call / System
  relatedRecordId: string | null;
  relatedRecordType: string | null;
  dateTime: string;
  direction: string; // Inbound / Outbound / System Generated
  handledBy: string | null;
  subject: string;
  summary: string | null;
  content: string | null;
  attachments: { name: string; url: string; type?: string }[];
  deliveryStatus: string; // Sent / Read / Failed (+ Scheduled / Cancelled)
  rawStatus: string | null;
  failureReason: string | null;
  actionTaken: string | null;
  nextFollowUpDate: string | null;
  assignedStaffId: string | null;
  assignedStaff: string | null;
  remarks: string | null;
  recipient: string | null;
  category: string | null;
  editable: boolean;
  source: 'communication' | 'application_activity' | 'lead_activity';
}

export function toDeliveryStatus(status?: string | null): string {
  const s = String(status || '').toLowerCase();
  if (['read', 'opened', 'clicked'].includes(s)) return 'Read';
  if (['failed', 'blocked', 'bounced', 'undelivered'].includes(s)) return 'Failed';
  if (s === 'scheduled') return 'Scheduled';
  if (s === 'cancelled') return 'Cancelled';
  return 'Sent';
}

const humanize = (v: string) =>
  String(v || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

@Injectable()
export class CommunicationHistoryService {
  constructor(
    @InjectRepository(CommunicationLog)
    private readonly repo: Repository<CommunicationLog>,
    private readonly dataSource: DataSource,
  ) {}

  toEntry(log: CommunicationLog): TimelineEntry {
    return {
      interactionId: log.id,
      applicantId: log.applicationId,
      leadId: log.leadId,
      applicationNo: log.applicationNo,
      applicantName: log.applicantName,
      channel: log.channel || 'Email',
      relatedRecordId: log.relatedRecordId || log.messageId || log.id,
      relatedRecordType: log.relatedRecordType || (log.channel === 'Email' ? 'email' : null),
      dateTime: (log.scheduledAt && log.status === 'Scheduled' ? log.scheduledAt : log.sentAt)?.toISOString?.() || String(log.sentAt),
      direction: log.direction || 'Outbound',
      handledBy: log.handledBy || log.sender || 'System',
      subject: log.subject,
      summary: log.summary || (log.content ? log.content.replace(/\s+/g, ' ').slice(0, 200) : null),
      content: log.content,
      attachments: Array.isArray(log.attachments) ? log.attachments : [],
      deliveryStatus: toDeliveryStatus(log.status),
      rawStatus: log.status,
      failureReason: log.failureReason || null,
      actionTaken: log.actionTaken,
      nextFollowUpDate: log.nextFollowUpDate ? new Date(log.nextFollowUpDate).toISOString() : null,
      assignedStaffId: log.assignedStaffId,
      assignedStaff: log.assignedStaffName,
      remarks: log.remarks,
      recipient: log.recipientEmail || log.recipientPhone || null,
      category: log.category,
      editable: true,
      source: 'communication',
    };
  }

  /** Chronological timeline (newest first) for one applicant or lead. */
  async getTimeline(
    orgId: string,
    q: { applicationId?: string; leadId?: string; channel?: string; includeSystem?: string | boolean },
  ): Promise<{ applicant: Record<string, any> | null; entries: TimelineEntry[] }> {
    if (!q.applicationId && !q.leadId) throw new BadRequestException('applicationId or leadId is required');

    const appRepo = this.dataSource.getRepository(Application);
    const appIds = new Set<string>();
    const appNos = new Set<string>();
    let leadId: string | null = q.leadId || null;
    let applicant: Record<string, any> | null = null;

    if (q.applicationId) {
      const app = await appRepo.findOne({ where: { id: q.applicationId, organizationId: orgId } });
      if (!app) throw new NotFoundException('Application not found');
      appIds.add(app.id);
      if (app.applicationNo) appNos.add(app.applicationNo.toLowerCase());
      leadId = leadId || app.leadId || null;
      applicant = {
        applicationId: app.id,
        leadId: app.leadId || null,
        applicationNo: app.applicationNo,
        name: app.name,
        email: app.email,
        phone: app.primaryMobile,
        program: app.program,
      };
    }
    if (leadId) {
      const lead = await this.dataSource.getRepository(Lead).findOne({ where: { id: leadId, organizationId: orgId } });
      if (!lead && !q.applicationId) throw new NotFoundException('Lead not found');
      const apps = await appRepo.find({ where: { leadId, organizationId: orgId }, select: ['id', 'applicationNo'] });
      apps.forEach((a) => {
        appIds.add(a.id);
        if (a.applicationNo) appNos.add(a.applicationNo.toLowerCase());
      });
      if (!applicant && lead) {
        applicant = {
          applicationId: apps[0]?.id || null,
          leadId: lead.id,
          applicationNo: apps[0]?.applicationNo || null,
          name: [lead.firstName, lead.lastName].filter(Boolean).join(' '),
          email: lead.email,
          phone: lead.phone,
          program: null,
        };
      }
    }

    const qb = this.repo
      .createQueryBuilder('log')
      .where('(log.organization_id = :orgId OR log.organization_id IS NULL)', { orgId })
      .andWhere(
        new Brackets((b) => {
          let first = true;
          const add = (sql: string, params: Record<string, any>) => {
            if (first) b.where(sql, params);
            else b.orWhere(sql, params);
            first = false;
          };
          if (appIds.size) add('log.application_id IN (:...appIds)', { appIds: [...appIds] });
          if (appNos.size) add('LOWER(log.application_no) IN (:...appNos)', { appNos: [...appNos] });
          if (leadId) add('log.lead_id = :leadId', { leadId });
          if (first) b.where('1 = 0');
        }),
      );
    if (q.channel && q.channel !== 'all' && q.channel !== 'System') qb.andWhere('log.channel = :ch', { ch: q.channel });
    const logs = q.channel === 'System' ? [] : await qb.orderBy('log.sent_at', 'DESC').take(1000).getMany();
    const entries: TimelineEntry[] = logs.map((l) => this.toEntry(l));

    const includeSystem = q.includeSystem === undefined || q.includeSystem === true || q.includeSystem === 'true';
    if (includeSystem && (!q.channel || q.channel === 'all' || q.channel === 'System')) {
      entries.push(...(await this.systemEntries(orgId, [...appIds], leadId, applicant)));
    }

    entries.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    return { applicant, entries };
  }

  /** Application / lead activity events shown as "System" interactions. */
  private async systemEntries(
    orgId: string,
    appIds: string[],
    leadId: string | null,
    applicant: Record<string, any> | null,
  ): Promise<TimelineEntry[]> {
    const out: TimelineEntry[] = [];
    const mk = (r: any, source: 'application_activity' | 'lead_activity'): TimelineEntry => {
      const statusChange = r.previous_status || r.new_status ? `Status: ${r.previous_status || '—'} → ${r.new_status || '—'}` : null;
      const content = [r.content, statusChange].filter(Boolean).join('\n');
      return {
        interactionId: `${source}:${r.id}`,
        applicantId: r.application_id || applicant?.applicationId || null,
        leadId: r.lead_id || leadId,
        applicationNo: applicant?.applicationNo || null,
        applicantName: applicant?.name || null,
        channel: 'System',
        relatedRecordId: r.id,
        relatedRecordType: source,
        dateTime: new Date(r.created_at).toISOString(),
        direction: 'System Generated',
        handledBy: r.actor_name || 'System',
        subject: humanize(r.action),
        summary: content ? content.slice(0, 200) : null,
        content: content || null,
        attachments: [],
        deliveryStatus: 'Sent',
        rawStatus: null,
        failureReason: null,
        actionTaken: r.disposition || null,
        nextFollowUpDate: null,
        assignedStaffId: null,
        assignedStaff: null,
        remarks: null,
        recipient: null,
        category: 'System',
        editable: false,
        source,
      };
    };
    try {
      if (appIds.length) {
        const rows = await this.dataSource.query(
          `SELECT a.*, u.name AS actor_name FROM application_activities a
             LEFT JOIN users u ON u.id = a.actor_id
            WHERE a.application_id = ANY($1::uuid[]) AND a.organization_id = $2
            ORDER BY a.created_at DESC LIMIT 500`,
          [appIds, orgId],
        );
        rows.forEach((r: any) => out.push(mk(r, 'application_activity')));
      }
    } catch {
      // table shape differs — skip system events
    }
    try {
      if (leadId) {
        const rows = await this.dataSource.query(
          `SELECT a.*, u.name AS actor_name FROM lead_activities a
             LEFT JOIN users u ON u.id = a.actor_id
            WHERE a.lead_id = $1 AND a.organization_id = $2
            ORDER BY a.created_at DESC LIMIT 500`,
          [leadId, orgId],
        );
        rows.forEach((r: any) => out.push(mk(r, 'lead_activity')));
      }
    } catch {
      // skip
    }
    return out;
  }

  /** Organization-wide interaction list (all channels) with filters. */
  async list(
    orgId: string,
    q: {
      channel?: string;
      direction?: string;
      status?: string;
      search?: string;
      applicationId?: string;
      leadId?: string;
      dateFrom?: string;
      dateTo?: string;
      followUpDue?: string;
      page?: string | number;
      limit?: string | number;
    },
  ) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 20));
    const qb = this.repo.createQueryBuilder('log').where(
      `(log.organization_id = :orgId OR (log.organization_id IS NULL AND EXISTS (
          SELECT 1 FROM applications app WHERE LOWER(app.application_no) = LOWER(log.application_no) AND app.organization_id = :orgId)))`,
      { orgId },
    );
    if (q.channel && q.channel !== 'all') qb.andWhere('log.channel = :ch', { ch: q.channel });
    if (q.direction && q.direction !== 'all') qb.andWhere('log.direction = :dir', { dir: q.direction });
    if (q.status && q.status !== 'all') {
      if (q.status === 'Read') qb.andWhere("log.status IN ('Read','Opened','Clicked')");
      else if (q.status === 'Failed') qb.andWhere("log.status IN ('Failed','Blocked','Bounced')");
      else if (q.status === 'Scheduled') qb.andWhere("log.status = 'Scheduled'");
      else if (q.status === 'Sent') qb.andWhere("log.status IN ('Sent','Delivered','Queued')");
      else qb.andWhere('log.status = :st', { st: q.status });
    }
    if (q.applicationId) qb.andWhere('log.application_id = :aid', { aid: q.applicationId });
    if (q.leadId) qb.andWhere('log.lead_id = :lid', { lid: q.leadId });
    if (q.dateFrom) qb.andWhere('log.sent_at >= :df', { df: new Date(q.dateFrom) });
    if (q.dateTo) qb.andWhere('log.sent_at < :dt', { dt: new Date(new Date(q.dateTo).getTime() + 86_400_000) });
    if (q.followUpDue === 'true') qb.andWhere('log.next_follow_up_date IS NOT NULL AND log.next_follow_up_date <= :now', { now: new Date() });
    if (q.search) {
      const s = `%${q.search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(log.applicant_name) LIKE :s', { s })
            .orWhere('LOWER(log.application_no) LIKE :s', { s })
            .orWhere('LOWER(log.recipient_email) LIKE :s', { s })
            .orWhere('log.recipient_phone LIKE :s', { s })
            .orWhere('LOWER(log.subject) LIKE :s', { s });
        }),
      );
    }
    qb.orderBy('log.sent_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map((r) => this.toEntry(r)), total, page, limit };
  }

  async stats(orgId: string) {
    const rows = await this.repo
      .createQueryBuilder('log')
      .select('log.channel', 'channel')
      .addSelect('log.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('log.organization_id = :orgId', { orgId })
      .groupBy('log.channel')
      .addGroupBy('log.status')
      .getRawMany();
    const out = {
      total: 0,
      byChannel: { Email: 0, SMS: 0, WhatsApp: 0, Call: 0, System: 0 } as Record<string, number>,
      byStatus: { Sent: 0, Read: 0, Failed: 0, Scheduled: 0 } as Record<string, number>,
      followUpsDue: 0,
    };
    for (const r of rows) {
      const c = Number(r.count) || 0;
      out.total += c;
      out.byChannel[r.channel] = (out.byChannel[r.channel] || 0) + c;
      const ds = toDeliveryStatus(r.status);
      out.byStatus[ds] = (out.byStatus[ds] || 0) + c;
    }
    out.followUpsDue = await this.repo
      .createQueryBuilder('log')
      .where('log.organization_id = :orgId', { orgId })
      .andWhere('log.next_follow_up_date IS NOT NULL AND log.next_follow_up_date <= :now', { now: new Date() })
      .getCount();
    return out;
  }

  private async staffName(orgId: string, userId?: string | null): Promise<string | null> {
    if (!userId) return null;
    const u = await this.dataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!u) throw new BadRequestException('Assigned staff member not found');
    if (u.organizationId && u.organizationId !== orgId) throw new BadRequestException('Staff member belongs to another organization');
    return u.name;
  }

  async createInteraction(orgId: string, dto: Record<string, any>, actor: { id?: string | null; name?: string | null }) {
    let applicationNo: string | null = null;
    let applicantName: string | null = null;
    let leadId: string | null = dto.leadId || null;
    let email: string | null = null;
    let phone: string | null = null;
    if (dto.applicationId) {
      const app = await this.dataSource.getRepository(Application).findOne({ where: { id: dto.applicationId, organizationId: orgId } });
      if (!app) throw new NotFoundException('Application not found');
      applicationNo = app.applicationNo;
      applicantName = app.name;
      leadId = leadId || app.leadId || null;
      email = app.email;
      phone = app.primaryMobile;
    } else if (leadId) {
      const lead = await this.dataSource.getRepository(Lead).findOne({ where: { id: leadId, organizationId: orgId } });
      if (!lead) throw new NotFoundException('Lead not found');
      applicantName = [lead.firstName, lead.lastName].filter(Boolean).join(' ');
      email = lead.email;
      phone = lead.phone;
    } else {
      throw new BadRequestException('applicationId or leadId is required');
    }
    const statusMap: Record<string, string> = { Sent: 'Sent', Read: 'Read', Failed: 'Failed' };
    const log = this.repo.create({
      organizationId: orgId,
      applicationId: dto.applicationId || null,
      leadId,
      applicationNo,
      applicantName,
      recipientEmail: dto.channel === 'Email' ? email : null,
      recipientPhone: ['SMS', 'WhatsApp', 'Call'].includes(dto.channel) ? phone : null,
      channel: dto.channel,
      direction: dto.direction,
      relatedRecordId: dto.relatedRecordId || null,
      relatedRecordType: 'manual',
      subject: dto.subject,
      summary: dto.summary || null,
      content: dto.content || dto.summary || dto.subject,
      attachments: Array.isArray(dto.attachments) ? dto.attachments.filter((a: any) => a?.url) : [],
      sender: actor.name || 'Staff',
      handledBy: dto.direction === 'System Generated' ? 'System' : actor.name || 'Staff',
      handledByUserId: actor.id || null,
      status: statusMap[dto.deliveryStatus] || 'Sent',
      actionTaken: dto.actionTaken || null,
      nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : null,
      assignedStaffId: dto.assignedStaffId || null,
      assignedStaffName: await this.staffName(orgId, dto.assignedStaffId),
      remarks: dto.remarks || null,
    });
    if (dto.dateTime) {
      const d = new Date(dto.dateTime);
      if (!isNaN(d.getTime())) log.sentAt = d;
    }
    return this.toEntry(await this.repo.save(log));
  }

  async updateInteraction(orgId: string, id: string, dto: Record<string, any>) {
    const log = await this.repo.findOne({ where: { id } });
    if (!log || (log.organizationId && log.organizationId !== orgId)) throw new NotFoundException('Interaction not found');
    if (dto.actionTaken !== undefined) log.actionTaken = dto.actionTaken || null;
    if (dto.remarks !== undefined) log.remarks = dto.remarks || null;
    if (dto.summary !== undefined) log.summary = dto.summary || null;
    if (dto.nextFollowUpDate !== undefined) {
      const d = dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : null;
      if (d && isNaN(d.getTime())) throw new BadRequestException('Invalid follow-up date');
      log.nextFollowUpDate = d;
    }
    if (dto.assignedStaffId !== undefined) {
      log.assignedStaffId = dto.assignedStaffId || null;
      log.assignedStaffName = await this.staffName(orgId, dto.assignedStaffId || null);
    }
    if (dto.deliveryStatus && log.relatedRecordType === 'manual') log.status = dto.deliveryStatus;
    return this.toEntry(await this.repo.save(log));
  }

  async getInteraction(orgId: string, id: string) {
    const log = await this.repo.findOne({ where: { id } });
    if (!log || (log.organizationId && log.organizationId !== orgId)) throw new NotFoundException('Interaction not found');
    return this.toEntry(log);
  }
}
