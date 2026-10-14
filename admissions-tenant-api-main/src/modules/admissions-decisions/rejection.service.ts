import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rejection, RejectionReason } from './entities/rejection.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { UpdateRejectionDto } from './dto/acceptance.dto.js';
import { DecisionSupportService } from './decision-support.service.js';
import { LetterTemplatesService, formatLetterDate } from './letter-templates.service.js';
import { LetterPdfService } from './letter-pdf.service.js';

export const REJECTION_REASON_LABELS: Record<string, string> = {
  below_cutoff: 'Below Cutoff',
  incomplete_documents: 'Incomplete Documents',
  failed_interview: 'Failed Interview',
  seat_unavailable: 'Seat Unavailable',
  other: 'Other',
};

// Rejections: created when a "Rejected" decision is released (or by staff for
// a rejection outside the workflow). The rejection letter is generated from a
// rejection LetterTemplate into a PDF and emailed with the PDF attached.
@Injectable()
export class RejectionService {
  private readonly logger = new Logger(RejectionService.name);

  constructor(
    @InjectRepository(Rejection)
    private readonly rejectionRepository: Repository<Rejection>,
    private readonly support: DecisionSupportService,
    private readonly templates: LetterTemplatesService,
    private readonly pdf: LetterPdfService,
  ) {}

  private async current(orgId: string, applicationId: string): Promise<Rejection | null> {
    return this.rejectionRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getRejection(orgId: string, applicationNo: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    return this.current(orgId, application.id);
  }

  async listRejections(orgId: string) {
    const rows = await this.rejectionRepository.find({
      where: { organizationId: orgId },
      relations: ['application', 'rejectionLetterTemplate'],
      order: { rejectionDate: 'DESC' },
    });
    return rows.map((r) => ({
      ...r,
      application: undefined,
      rejectionLetterTemplate: undefined,
      templateName: r.rejectionLetterTemplate?.name ?? null,
      applicationNo: r.application?.applicationNo,
      applicantName: r.application?.name,
      program: r.application?.program,
    }));
  }

  // Called when a "Rejected" decision is released.
  async createForDecision(application: Application, actorId: string | null, communicate: boolean) {
    let rejection = await this.current(application.organizationId, application.id);
    if (!rejection) {
      rejection = await this.rejectionRepository.save(
        this.rejectionRepository.create({
          organizationId: application.organizationId,
          applicationId: application.id,
          rejectionReason: RejectionReason.OTHER,
          rejectionDate: new Date(),
          eligibleForReapply: true,
          createdBy: actorId as string,
        }),
      );
    }
    if (communicate && !rejection.communicationSent) {
      try {
        await this.sendFor(application, rejection, actorId, false);
      } catch (err) {
        this.logger.error(`Rejection letter for ${application.applicationNo} failed: ${(err as Error).message}`);
      }
    }
    return rejection;
  }

  // Create or edit the rejection record. Does not send anything.
  async upsert(orgId: string, applicationNo: string, dto: UpdateRejectionDto, actorId: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    let rejection = await this.current(orgId, application.id);
    if (!rejection) {
      rejection = this.rejectionRepository.create({
        organizationId: orgId,
        applicationId: application.id,
        rejectionDate: new Date(),
        createdBy: actorId,
      });
    }
    if (dto.rejectionReason !== undefined) rejection.rejectionReason = dto.rejectionReason as RejectionReason;
    if (dto.detailedReason !== undefined) rejection.detailedReason = dto.detailedReason;
    if (dto.rejectionLetterTemplateId !== undefined) {
      if (dto.rejectionLetterTemplateId) await this.templates.resolve(orgId, 'rejection', dto.rejectionLetterTemplateId);
      rejection.rejectionLetterTemplateId = dto.rejectionLetterTemplateId || null;
    }
    if (dto.alternateOptionsSuggested !== undefined) rejection.alternateOptionsSuggested = dto.alternateOptionsSuggested;
    if (dto.eligibleForReapply !== undefined) rejection.eligibleForReapply = dto.eligibleForReapply;
    if (dto.nextIntake !== undefined) rejection.nextIntake = dto.nextIntake || null;
    rejection.updatedBy = actorId;
    const saved = await this.rejectionRepository.save(rejection);
    if (application.formStatus !== 'rejected') {
      application.formStatus = 'rejected';
      await this.support.saveApplication(application);
    }
    return saved;
  }

  async sendLetter(orgId: string, applicationNo: string, actorId: string) {
    const application = await this.support.findApplication(orgId, applicationNo);
    const rejection = await this.current(orgId, application.id);
    if (!rejection) throw new NotFoundException('No rejection record exists for this application yet.');
    return this.sendFor(application, rejection, actorId, true);
  }

  private async sendFor(application: Application, rejection: Rejection, actorId: string | null, strict: boolean) {
    const orgId = application.organizationId;
    const template = await this.templates.resolve(orgId, 'rejection', rejection.rejectionLetterTemplateId);
    const orgName = await this.support.organizationName(orgId);
    const values = {
      Name: application.name,
      Program: application.program,
      Application_No: application.applicationNo,
      Date: formatLetterDate(new Date()),
      Rejection_Reason: REJECTION_REASON_LABELS[rejection.rejectionReason] || rejection.rejectionReason,
      Detailed_Reason: rejection.detailedReason || '',
      Alternate_Options: rejection.alternateOptionsSuggested || 'None',
      Next_Intake: rejection.eligibleForReapply ? rejection.nextIntake || 'next' : 'N/A',
      Organization: orgName,
    };
    const html = this.templates.render(template.bodyHtml, values);
    const buffer = await this.pdf.renderPdf(html, { title: `Rejection Letter ${application.applicationNo}`, organizationName: orgName });
    const rel = await this.pdf.save(orgId, 'rejection', rejection.id, buffer);
    const emailed = await this.pdf.sendWithAttachment({
      organizationId: orgId,
      to: application.email,
      subject: this.templates.renderText(template.subject || 'Your application {{Application_No}}', values),
      html,
      attachments: [{ filename: `Rejection-Letter-${application.applicationNo.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`, content: buffer }],
    });
    await this.rejectionRepository.update(rejection.id, {
      rejectionLetterTemplateId: template.id,
      rejectionLetterPdfPath: rel,
      rejectionLetterPdf: `/organizations/${orgId}/rejections/${rejection.id}/pdf`,
      communicationSent: emailed || rejection.communicationSent,
      communicationSentAt: emailed ? new Date() : rejection.communicationSentAt,
      updatedBy: actorId as string,
    });
    if (!emailed && strict) {
      throw new BadRequestException('The rejection letter was generated but the email could not be sent. Check the email (SMTP) settings.');
    }
    return this.rejectionRepository.findOne({ where: { id: rejection.id } });
  }

  async getPdf(orgId: string, rejectionId: string) {
    const r = await this.rejectionRepository
      .createQueryBuilder('r')
      .addSelect('r.rejectionLetterPdfPath')
      .leftJoinAndSelect('r.application', 'app')
      .where('r.id = :id AND r.organization_id = :orgId', { id: rejectionId, orgId })
      .getOne();
    if (!r) throw new NotFoundException('Rejection not found');
    const buffer = await this.pdf.read(r.rejectionLetterPdfPath);
    return { buffer, filename: `Rejection-Letter-${(r.application?.applicationNo || r.id).replace(/[^A-Za-z0-9_-]/g, '_')}.pdf` };
  }
}
