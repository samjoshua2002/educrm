import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rejection, RejectionReason } from './entities/rejection.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { MailerService } from '../notifications/mailer.service.js';
import { UpdateRejectionDto } from './dto/update-rejection.dto.js';

// Phase 6b — Rejections. Created automatically when
// AdmissionDecisionsService.finalizeDecision locks a decision with
// finalDecision = 'rejected' (default rejectionReason = 'other'; an admin
// can refine the detailed reason afterward via PATCH .../rejection), or can
// be created standalone for rejections outside the decision workflow (e.g.
// a verification-stage rejection).
@Injectable()
export class RejectionService {
  constructor(
    @InjectRepository(Rejection)
    private readonly rejectionRepository: Repository<Rejection>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly mailerService: MailerService,
  ) {}

  private async findApplication(orgId: string, applicationNo: string): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { applicationNo, organizationId: orgId },
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationNo} not found`);
    }
    return application;
  }

  private async findCurrentRejection(orgId: string, applicationId: string): Promise<Rejection | null> {
    return this.rejectionRepository.findOne({
      where: { organizationId: orgId, applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  // Upserts the rejection record for an application, then (re)sends the
  // rejection email — matching sendOfferLetter's "set flag, then send"
  // ordering (MailerService itself catches/logs without throwing).
  async createRejectionRecord(orgId: string, applicationNo: string, dto: UpdateRejectionDto) {
    const application = await this.findApplication(orgId, applicationNo);
    let rejection = await this.findCurrentRejection(orgId, application.id);

    if (!rejection) {
      rejection = this.rejectionRepository.create({
        organizationId: orgId,
        applicationId: application.id,
        rejectionReason: (dto.rejectionReason as RejectionReason) ?? RejectionReason.OTHER,
        rejectionDate: new Date(),
      });
    } else if (dto.rejectionReason !== undefined) {
      rejection.rejectionReason = dto.rejectionReason as RejectionReason;
    }

    if (dto.detailedReason !== undefined) rejection.detailedReason = dto.detailedReason;
    if (dto.alternateOptionsSuggested !== undefined) rejection.alternateOptionsSuggested = dto.alternateOptionsSuggested;
    if (dto.eligibleForReapply !== undefined) rejection.eligibleForReapply = dto.eligibleForReapply;
    if (dto.nextIntake !== undefined) rejection.nextIntake = dto.nextIntake;

    rejection.communicationSent = true;
    await this.rejectionRepository.save(rejection);

    await this.mailerService.sendRejectionEmail(application, rejection);

    return rejection;
  }

  async getRejection(orgId: string, applicationNo: string) {
    const application = await this.findApplication(orgId, applicationNo);
    const rejection = await this.findCurrentRejection(orgId, application.id);
    if (!rejection) {
      throw new NotFoundException('No rejection record exists for this application yet.');
    }
    return rejection;
  }
}
