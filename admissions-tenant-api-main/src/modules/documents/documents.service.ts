import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ApplicationDocument } from './entities/application-document.entity.js';
import { DocumentVerificationLog } from './entities/document-verification-log.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { User } from '../users/entities/user.entity.js';
import { ApplicationStatusService, RequestUser } from '../applications/application-status.service.js';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service.js';
import { MailerService } from '../notifications/mailer.service.js';
import { RemindersService } from '../reminders/reminders.service.js';
import { Role } from '../../common/enums/roles.enum.js';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  DOCUMENT_TYPES,
  DOCUMENT_VERIFICATION_STATUSES,
} from '../applications/application-workflow.constants.js';
import { UploadDocumentDto, VerifyDocumentDto } from './dto/document.dto.js';

const VERIFIER_ROLES = [Role.SUPERADMIN, Role.ORG_ADMIN, Role.APPLICATION_MANAGER] as string[];
const UPLOADER_ROLES = [...VERIFIER_ROLES, Role.COUNSELOR, Role.STUDENT] as string[];

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(ApplicationDocument)
    private readonly docRepo: Repository<ApplicationDocument>,
    @InjectRepository(DocumentVerificationLog)
    private readonly logRepo: Repository<DocumentVerificationLog>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly statusService: ApplicationStatusService,
    private readonly inApp: InAppNotificationsService,
    private readonly mailer: MailerService,
    private readonly reminders: RemindersService,
  ) {}

  async requirements(orgId: string) {
    const s = await this.statusService.getSettings(orgId);
    return {
      documentTypes: DOCUMENT_TYPES,
      requiredDocumentTypes: s.requiredDocumentTypes,
      verificationStatuses: DOCUMENT_VERIFICATION_STATUSES,
      allowedMimeTypes: Object.keys(ALLOWED_DOCUMENT_MIME_TYPES),
      allowedExtensions: Object.values(ALLOWED_DOCUMENT_MIME_TYPES).flat(),
      maxSizeMb: s.maxDocumentSizeMb,
    };
  }

  private async userName(userId?: string | null) {
    if (!userId) return null;
    const u = await this.userRepo.findOne({ where: { id: userId } });
    return u?.name ?? null;
  }

  private toView(d: ApplicationDocument & { verifiedByUser?: User }, forApplicant: boolean) {
    return {
      id: d.id,
      documentId: d.documentNo,
      applicationId: d.applicationId,
      documentType: d.documentType,
      documentName: d.documentName,
      documentUrl: d.documentUrl,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      uploadDate: d.uploadDate,
      uploadedBy: d.uploadedByName || d.uploadedByType,
      uploadedByType: d.uploadedByType,
      verificationStatus: d.verificationStatus,
      verifiedBy: forApplicant ? (d.verifiedBy ? 'Admissions team' : null) : d.verifiedByUser?.name ?? null,
      verificationDate: d.verificationDate,
      rejectionReason: d.rejectionReason,
      reuploadRequired: d.reuploadRequired,
      documentVersion: d.documentVersion,
      isLatest: d.isLatest,
    };
  }

  async list(orgId: string, appIdOrNo: string, user: RequestUser, includeHistory = false) {
    const app = await this.statusService.findApplication(appIdOrNo, orgId);
    this.statusService.assertAccess(app, user);
    const docs = await this.docRepo.find({
      where: includeHistory ? { applicationId: app.id } : { applicationId: app.id, isLatest: true },
      relations: ['verifiedByUser'],
      order: { documentType: 'ASC', documentVersion: 'DESC' },
    });
    const forApplicant = user.role === Role.STUDENT;
    const progress = await this.statusService.documentProgress(app);
    return {
      applicationId: app.id,
      applicationNo: app.applicationNo,
      documents: docs.map((d) => this.toView(d, forApplicant)),
      progress,
      requirements: await this.requirements(orgId),
    };
  }

  async upload(orgId: string, appIdOrNo: string, user: RequestUser, dto: UploadDocumentDto) {
    if (!UPLOADER_ROLES.includes(user.role)) throw new ForbiddenException('Your role cannot upload documents');
    const app = await this.statusService.findApplication(appIdOrNo, orgId);
    this.statusService.assertAccess(app, user);

    // File type / size validation (server side, mirrors the upload widget).
    const settings = await this.statusService.getSettings(orgId);
    const allowedExt = ALLOWED_DOCUMENT_MIME_TYPES[dto.mimeType];
    if (!allowedExt) throw new BadRequestException('Only PDF, JPG and PNG files are allowed');
    const ext = (dto.documentName.split('.').pop() || '').toLowerCase();
    if (!allowedExt.includes(ext)) {
      throw new BadRequestException(`File extension ".${ext}" does not match the file type (${allowedExt.join('/')})`);
    }
    const maxBytes = settings.maxDocumentSizeMb * 1024 * 1024;
    if (dto.fileSize > maxBytes) {
      throw new BadRequestException(`File is larger than the ${settings.maxDocumentSizeMb} MB limit`);
    }

    const previous = await this.docRepo.findOne({
      where: { applicationId: app.id, documentType: dto.documentType, isLatest: true },
    });
    if (previous && user.role === Role.STUDENT && previous.verificationStatus === 'Approved' && !previous.reuploadRequired) {
      throw new BadRequestException(`${dto.documentType} is already approved and cannot be replaced`);
    }

    const isStudent = user.role === Role.STUDENT;
    const name = (await this.userName(user.sub)) || (isStudent ? app.name : null);
    if (previous) {
      previous.isLatest = false;
      await this.docRepo.save(previous);
    }
    const doc = await this.docRepo.save(
      this.docRepo.create({
        organizationId: orgId,
        applicationId: app.id,
        documentType: dto.documentType,
        documentName: dto.documentName,
        documentUrl: dto.documentUrl,
        storageKey: dto.storageKey ?? null,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        uploadedBy: user.sub ?? null,
        uploadedByType: isStudent ? 'Applicant' : 'User',
        uploadedByName: name,
        verificationStatus: 'Pending',
        reuploadRequired: false,
        documentVersion: previous ? previous.documentVersion + 1 : 1,
        isLatest: true,
        previousVersionId: previous?.id ?? null,
      }),
    );

    await this.writeLog(doc, previous ? 'Re-uploaded' : 'Uploaded', user, previous?.verificationStatus ?? null, 'Pending', null);

    app.lastActivityAt = new Date();
    await this.appRepo.update({ id: app.id }, { lastActivityAt: app.lastActivityAt });

    await this.inApp.notify({
      organizationId: orgId,
      recipientRole: Role.APPLICATION_MANAGER,
      module: 'applications',
      type: 'document_uploaded',
      severity: 'info',
      title: `${dto.documentType} ${previous ? 're-uploaded' : 'uploaded'} — ${app.applicationNo}`,
      body: `${app.name} uploaded ${dto.documentName} (version ${doc.documentVersion}). Verification pending.`,
      link: `/organization/applications/${app.applicationNo}`,
      relatedEntityId: app.id,
    });

    await this.statusService.evaluate(app.id, user.sub);
    await this.reminders.refreshForApplication(app.id).catch(() => undefined);
    return this.toView(doc, isStudent);
  }

  async verify(orgId: string, documentId: string, user: RequestUser, dto: VerifyDocumentDto) {
    if (!VERIFIER_ROLES.includes(user.role)) throw new ForbiddenException('Your role cannot verify documents');
    const doc = await this.docRepo.findOne({ where: { id: documentId, organizationId: orgId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (!doc.isLatest) throw new BadRequestException('Only the latest version of a document can be verified');
    if (dto.action !== 'approve' && !dto.reason?.trim()) {
      throw new BadRequestException('A reason is required');
    }

    const prev = doc.verificationStatus;
    const now = new Date();
    doc.verifiedBy = user.sub;
    doc.verificationDate = now;
    let action: string;
    if (dto.action === 'approve') {
      doc.verificationStatus = 'Approved';
      doc.rejectionReason = null;
      doc.reuploadRequired = false;
      action = 'Approved';
    } else if (dto.action === 'reject') {
      doc.verificationStatus = 'Rejected';
      doc.rejectionReason = dto.reason!.trim();
      doc.reuploadRequired = true;
      action = 'Rejected';
    } else {
      // Request re-upload: the file is not accepted, applicant must send a new version.
      doc.verificationStatus = 'Rejected';
      doc.rejectionReason = dto.reason!.trim();
      doc.reuploadRequired = true;
      action = 'Re-upload Requested';
    }
    await this.docRepo.save(doc);
    await this.writeLog(doc, action, user, prev, doc.verificationStatus, dto.reason ?? null);

    const app = await this.appRepo.findOne({ where: { id: doc.applicationId } });
    if (app) {
      await this.appRepo.update({ id: app.id }, { lastActivityAt: now, updatedBy: user.sub });
      if (dto.action !== 'approve') await this.notifyApplicantOfRejection(app, doc, action);
      await this.statusService.evaluate(app.id, user.sub);
      await this.reminders.refreshForApplication(app.id).catch(() => undefined);
    }
    const fresh = await this.docRepo.findOne({ where: { id: doc.id }, relations: ['verifiedByUser'] });
    return this.toView(fresh!, false);
  }

  private async notifyApplicantOfRejection(app: Application, doc: ApplicationDocument, action: string) {
    const recipientUserId = await this.statusService.findStudentUserId(app);
    const title =
      action === 'Rejected'
        ? `${doc.documentType} rejected — please re-upload`
        : `Please re-upload your ${doc.documentType}`;
    const body = `Reason: ${doc.rejectionReason}. Upload a new PDF, JPG or PNG file from your application page.`;
    if (recipientUserId) {
      await this.inApp.notify({
        organizationId: app.organizationId,
        recipientUserId,
        module: 'applications',
        type: 'document_reupload_required',
        severity: 'warning',
        title,
        body,
        link: '/my-application',
        relatedEntityId: app.id,
      });
    }
    if (app.email) {
      try {
        await this.mailer.sendMail({
          to: app.email,
          organizationId: app.organizationId,
          subject: `${title} (${app.applicationNo})`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
            <p>Dear ${app.name || 'Applicant'},</p>
            <p>Your <strong>${doc.documentType}</strong> document (<em>${doc.documentName}</em>) needs to be uploaded again.</p>
            <p><strong>Reason:</strong> ${doc.rejectionReason}</p>
            <p>Please sign in to your applicant portal and upload a new PDF, JPG or PNG file.</p>
            <p>Application number: <strong>${app.applicationNo}</strong></p>
          </div>`,
          text: `${title}. ${body}`,
        });
      } catch (e) {
        this.logger.warn(`Re-upload e-mail failed: ${(e as Error).message}`);
      }
    }
  }

  private async writeLog(
    doc: ApplicationDocument,
    action: string,
    user: RequestUser,
    previousStatus: string | null,
    newStatus: string | null,
    remarks: string | null,
  ) {
    await this.logRepo.save(
      this.logRepo.create({
        organizationId: doc.organizationId,
        applicationId: doc.applicationId,
        documentId: doc.id,
        documentType: doc.documentType,
        documentVersion: doc.documentVersion,
        action,
        previousStatus,
        newStatus,
        remarks,
        actorId: user.sub ?? null,
        actorName: await this.userName(user.sub),
        actorRole: user.role,
      }),
    );
  }

  async logs(orgId: string, appIdOrNo: string, user: RequestUser) {
    const app = await this.statusService.findApplication(appIdOrNo, orgId);
    this.statusService.assertAccess(app, user);
    const logs = await this.logRepo.find({ where: { applicationId: app.id }, order: { createdAt: 'DESC' } });
    const forApplicant = user.role === Role.STUDENT;
    return logs.map((l) => ({
      id: l.id,
      documentId: l.documentId,
      documentType: l.documentType,
      documentVersion: l.documentVersion,
      action: l.action,
      previousStatus: l.previousStatus,
      newStatus: l.newStatus,
      remarks: l.remarks,
      actorName: forApplicant ? (l.actorRole === Role.STUDENT ? 'You' : 'Admissions team') : l.actorName,
      actorRole: l.actorRole,
      createdAt: l.createdAt,
    }));
  }

  /** Verification queue across the organization (admin). */
  async queue(
    orgId: string,
    q: { verificationStatus?: string; documentType?: string; search?: string; page?: string; limit?: string },
  ) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 20));
    const qb = this.docRepo
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.application', 'app')
      .leftJoinAndSelect('d.verifiedByUser', 'vb')
      .where('d.organization_id = :orgId', { orgId })
      .andWhere('d.is_latest = true');
    if (q.verificationStatus && q.verificationStatus !== 'all') {
      qb.andWhere('d.verification_status = :vs', { vs: q.verificationStatus });
    }
    if (q.documentType && q.documentType !== 'all') qb.andWhere('d.document_type = :dt', { dt: q.documentType });
    if (q.search) {
      qb.andWhere('(app.name ILIKE :s OR app.application_no ILIKE :s OR d.document_name ILIKE :s)', {
        s: `%${q.search}%`,
      });
    }
    const [rows, total] = await qb
      .orderBy('d.uploadDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const counts = await this.docRepo
      .createQueryBuilder('d')
      .select('d.verification_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('d.organization_id = :orgId', { orgId })
      .andWhere('d.is_latest = true')
      .groupBy('d.verification_status')
      .getRawMany();
    return {
      items: rows.map((d) => ({
        ...this.toView(d, false),
        applicationNo: d.application?.applicationNo,
        applicantName: d.application?.name,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts: Object.fromEntries(counts.map((c) => [c.status, Number(c.count)])),
    };
  }

  /** Used by the reminders engine. */
  async latestByApplication(applicationIds: string[]) {
    if (applicationIds.length === 0) return [];
    return this.docRepo.find({ where: { applicationId: In(applicationIds), isLatest: true } });
  }
}
