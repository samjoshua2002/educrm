import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { CommunicationLog } from './entities/communication-log.entity.js';
import { CreateCommunicationLogDto } from './dto/create-communication-log.dto.js';
import { Application } from '../applications/entities/application.entity.js';
import { Interview } from '../interviews/entities/interview.entity.js';
import { InterviewSlot } from '../interviews/entities/interview-slot.entity.js';
import { ScoreConversionConfig } from '../interviews/entities/score-conversion-config.entity.js';

@Injectable()
export class CommunicationsService {
  constructor(
    @InjectRepository(CommunicationLog)
    private readonly repo: Repository<CommunicationLog>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCommunicationLogDto): Promise<CommunicationLog> {
    const log = this.repo.create({
      organizationId: dto.organizationId ?? null,
      applicationNo: dto.applicationNo ?? null,
      applicantName: dto.applicantName ?? null,
      recipientEmail: dto.recipientEmail ?? null,
      recipientPhone: dto.recipientPhone ?? null,
      channel: dto.channel || 'Email',
      category: dto.category ?? null,
      categoryId: dto.categoryId ?? null,
      templateId: dto.templateId ?? null,
      subject: dto.subject,
      content: dto.content,
      footer: dto.footer ?? null,
      sender: dto.sender ?? null,
      status: dto.status || 'Sent',
      messageId: dto.messageId ?? null,
    });
    return this.repo.save(log);
  }

  // Ensures any interview actions (Scheduled, Rescheduled) or declaration date
  // announcements for this application are synchronized into communication logs.
  private async ensureBackfilledLogs(applicationNo: string, orgId?: string): Promise<void> {
    try {
      const cleanApp = applicationNo.trim();
      const app = await this.dataSource.getRepository(Application).findOne({
        where: orgId
          ? { applicationNo: ILike(cleanApp), organizationId: orgId }
          : { applicationNo: ILike(cleanApp) },
      });
      if (!app) return;

      // 1. Application Received log
      const appExisting = await this.repo.findOne({
        where: [
          { applicationNo: app.applicationNo, category: ILike('%Application Received%') },
          { applicationNo: app.applicationNo, category: ILike('%Application Submitted%') },
        ],
      });
      if (!appExisting) {
        await this.create({
          organizationId: app.organizationId,
          applicationNo: app.applicationNo,
          applicantName: app.name,
          recipientEmail: app.email,
          recipientPhone: app.primaryMobile,
          channel: 'Email',
          category: 'Application Received',
          subject: `Application Submitted Successfully — ${app.applicationNo}`,
          content: `Dear ${app.name || 'Applicant'},

Thank you for submitting your application ${app.applicationNo} for ${app.program || 'Admissions 2026'}.

Your application has been received and is currently under review by our admissions team.

Best regards,
Admissions Directorate`,
          sender: 'Admissions Office',
          status: 'Sent',
        });
      }

      // 2. Document Verification log
      if (app.verificationStatus === 'verified') {
        const verExisting = await this.repo.findOne({
          where: { applicationNo: app.applicationNo, category: ILike('%Document Verification%') },
        });
        if (!verExisting) {
          await this.create({
            organizationId: app.organizationId,
            applicationNo: app.applicationNo,
            applicantName: app.name,
            recipientEmail: app.email,
            recipientPhone: app.primaryMobile,
            channel: 'Email',
            category: 'Document Verification',
            subject: `Application Documents Verified Successfully — ${app.applicationNo}`,
            content: `Dear ${app.name || 'Applicant'},

We are pleased to inform you that your application documents for ${app.applicationNo} have been verified successfully.

Please track your student portal for your upcoming GD & Interview selection schedule.

Best regards,
Verification Desk`,
            sender: 'Verification Desk',
            status: 'Sent',
          });
        }
      }

      // 3. Interviews (Scheduled, Rescheduled, Completed / Thanks for attending)
      const interviews = await this.dataSource.getRepository(Interview).find({
        where: { applicationId: app.id },
        order: { createdAt: 'ASC' },
      });

      for (const inv of interviews) {
        if (!['Scheduled', 'Rescheduled', 'Completed', 'Cancelled'].includes(inv.status)) continue;
        const category =
          inv.status === 'Rescheduled'
            ? 'Interview Rescheduled'
            : inv.status === 'Completed'
            ? 'Interview Completed'
            : inv.status === 'Cancelled'
            ? 'Interview Cancelled'
            : 'Interview Scheduled';
        const existing = await this.repo.findOne({
          where: { applicationNo: app.applicationNo, category: ILike(`%${category}%`) },
        });

        if (!existing) {
          let slot = inv.slotId
            ? await this.dataSource.getRepository(InterviewSlot).findOne({ where: { id: inv.slotId } })
            : null;
          const typeLabel = inv.interviewType === 'GD' ? 'Group Discussion' : 'Personal Interview';
          const fmtDate = (d: any) =>
            d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Confirmed Date';
          const fmtTime = (d: any) =>
            d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Confirmed Time';

          const subject =
            inv.status === 'Rescheduled'
              ? `Interview Rescheduled — ${app.applicationNo}`
              : inv.status === 'Completed'
              ? `Interview Completed — ${app.applicationNo}`
              : inv.status === 'Cancelled'
              ? `Interview Cancelled — ${app.applicationNo}`
              : `Interview Scheduled — ${app.applicationNo}`;

          const content =
            inv.status === 'Completed'
              ? `Dear ${app.name || 'Applicant'},

Thank you for attending your ${typeLabel} for application ${app.applicationNo}. Your evaluation result will be communicated to you once the final selection scores are published.

Best regards,
Admissions Directorate`
              : inv.status === 'Cancelled'
              ? `Dear ${app.name || 'Applicant'},

Your ${typeLabel} for application ${app.applicationNo} has been cancelled. Our team will be in touch if it needs to be rescheduled.

Best regards,
Admissions Directorate`
              : `Dear ${app.name || 'Applicant'},

Your ${typeLabel} for application ${app.applicationNo} has been ${inv.status.toLowerCase()}.

Date: ${slot ? fmtDate(slot.slotDate) : 'Confirmed Slot'}
Time: ${slot ? `${fmtTime(slot.startTime)} – ${fmtTime(slot.endTime)}` : 'Scheduled Time'}
Mode: ${slot?.mode === 'Virtual' ? 'Online' : 'In person'}
${slot?.mode === 'Virtual' && slot?.meetingLink ? `Meeting Link: ${slot.meetingLink}` : ''}
${slot?.location ? `Venue: ${slot.location}` : ''}

Please be available a few minutes early.`;

          await this.create({
            organizationId: app.organizationId,
            applicationNo: app.applicationNo,
            applicantName: app.name,
            recipientEmail: app.email,
            recipientPhone: app.primaryMobile,
            channel: 'Email',
            category,
            subject,
            content,
            sender: 'Admissions Desk',
            status: 'Sent',
          });
        }
      }

      if (app.organizationId) {
        const cfg = await this.dataSource.getRepository(ScoreConversionConfig).findOne({
          where: { organizationId: app.organizationId },
        });
        if (cfg && cfg.resultsDeclarationDate) {
          const declExisting = await this.repo.findOne({
            where: { applicationNo: app.applicationNo, category: ILike('%Results Declaration%') },
          });
          if (!declExisting) {
            const formattedDate = new Date(cfg.resultsDeclarationDate).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
            const subject = `Results Declaration Date Announced — ${app.applicationNo}`;
            const content = `Dear ${app.name || 'Applicant'},

We are pleased to inform you that the evaluation results for your application ${app.applicationNo} (${app.program || 'Admissions 2026'}) will be officially announced on:

Scheduled Declaration Date & Time: ${formattedDate}

Your composite scores, section evaluations, and selection status will be available on your student portal at the scheduled time.`;

            await this.create({
              organizationId: app.organizationId,
              applicationNo: app.applicationNo,
              applicantName: app.name,
              recipientEmail: app.email,
              recipientPhone: app.primaryMobile,
              channel: 'Email',
              category: 'Results Declaration',
              subject,
              content,
              sender: 'Admissions Desk',
              status: 'Sent',
            });
          }
        }
      }
    } catch {
      // Best-effort auto-sync
    }
  }

  async findAll(
    orgId?: string,
    applicationNo?: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: CommunicationLog[]; total: number; page: number; limit: number }> {
    if (applicationNo) {
      await this.ensureBackfilledLogs(applicationNo, orgId);
    } else if (orgId) {
      try {
        const apps = await this.dataSource.getRepository(Application).find({
          where: { organizationId: orgId },
          select: ['applicationNo'],
        });
        for (const app of apps) {
          if (app.applicationNo) {
            await this.ensureBackfilledLogs(app.applicationNo, orgId);
          }
        }
      } catch {
        // best effort
      }
    }

    const qb = this.repo.createQueryBuilder('log');

    if (orgId) {
      qb.andWhere('(log.organization_id = :orgId OR log.organization_id IS NULL)', { orgId });
      if (!applicationNo) {
        qb.andWhere(
          'EXISTS (SELECT 1 FROM applications app WHERE LOWER(app.application_no) = LOWER(log.application_no) AND app.organization_id = :orgId)',
          { orgId },
        );
      }
    }
    if (applicationNo) {
      qb.andWhere('LOWER(log.application_no) = LOWER(:applicationNo)', { applicationNo: applicationNo.trim() });
    }

    qb.orderBy('log.sent_at', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // Accepts either a communication log UUID, or an application number
  async findOne(idOrApplicationNo: string): Promise<CommunicationLog> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrApplicationNo,
    );

    if (!isUuid) {
      await this.ensureBackfilledLogs(idOrApplicationNo);
    }

    const log = isUuid
      ? await this.repo.findOne({ where: { id: idOrApplicationNo } })
      : await this.repo.findOne({
          where: { applicationNo: ILike(idOrApplicationNo.trim()) },
          order: { sentAt: 'DESC' },
        });

    if (!log) {
      throw new NotFoundException(`Communication log "${idOrApplicationNo}" not found`);
    }
    return log;
  }
}
