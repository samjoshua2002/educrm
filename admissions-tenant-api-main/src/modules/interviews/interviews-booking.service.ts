import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Interview } from './entities/interview.entity.js';
import { InterviewSlot } from './entities/interview-slot.entity.js';
import { Application } from '../applications/entities/application.entity.js';
import { BookInterviewDto } from './dto/book-interview.dto.js';
import { RescheduleInterviewDto } from './dto/reschedule-interview.dto.js';
import { CompleteInterviewDto } from './dto/complete-interview.dto.js';

@Injectable()
export class InterviewsBookingService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(InterviewSlot)
    private readonly slotRepository: Repository<InterviewSlot>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly dataSource: DataSource,
  ) {}

  // Books a shortlisted Application into an Available slot: creates the
  // Interview, marks the slot Booked, and mirrors the date/time/location
  // onto Application's flat columns (what the GD-Interview list page reads).
  async book(orgId: string, dto: BookInterviewDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const application = await manager.findOne(Application, {
        where: { id: dto.applicationId, organizationId: orgId },
      });
      if (!application) {
        throw new NotFoundException(`Application #${dto.applicationId} not found`);
      }
      if (application.shortlistStatus !== 'Eligible') {
        throw new BadRequestException('Only applications with shortlistStatus "Eligible" can be scheduled for interview.');
      }

      const slot = await manager.findOne(InterviewSlot, { where: { id: dto.slotId, organizationId: orgId } });
      if (!slot) {
        throw new NotFoundException(`Interview slot #${dto.slotId} not found`);
      }
      if (slot.status !== 'Available') {
        throw new BadRequestException(`Slot is not available (current status: ${slot.status}).`);
      }
      if (slot.interviewType !== dto.interviewType) {
        throw new BadRequestException(`Slot is a ${slot.interviewType} slot, cannot book a ${dto.interviewType} interview into it.`);
      }

      const existingRounds = await manager.count(Interview, {
        where: { applicationId: application.id, interviewType: dto.interviewType },
      });

      const interview = manager.create(Interview, {
        organizationId: orgId,
        applicationId: application.id,
        interviewType: dto.interviewType,
        round: existingRounds + 1,
        slotId: slot.id,
        status: 'Scheduled',
        assignedPanel: dto.panelUserIds,
        createdBy: actorId,
        updatedBy: actorId,
      });
      await manager.save(interview);

      slot.status = 'Booked';
      slot.updatedBy = actorId;
      await manager.save(slot);

      await this.syncApplicationFlatFields(manager, application, slot);

      return interview;
    });
  }

  async reschedule(orgId: string, interviewId: string, dto: RescheduleInterviewDto, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const interview = await manager.findOne(Interview, { where: { id: interviewId, organizationId: orgId } });
      if (!interview) {
        throw new NotFoundException(`Interview #${interviewId} not found`);
      }
      if (['Completed', 'Cancelled'].includes(interview.status)) {
        throw new BadRequestException(`Cannot reschedule an interview with status "${interview.status}".`);
      }

      const newSlot = await manager.findOne(InterviewSlot, { where: { id: dto.newSlotId, organizationId: orgId } });
      if (!newSlot) {
        throw new NotFoundException(`Interview slot #${dto.newSlotId} not found`);
      }
      if (newSlot.status !== 'Available') {
        throw new BadRequestException(`New slot is not available (current status: ${newSlot.status}).`);
      }
      if (newSlot.interviewType !== interview.interviewType) {
        throw new BadRequestException(`Slot is a ${newSlot.interviewType} slot, cannot reschedule a ${interview.interviewType} interview into it.`);
      }

      if (interview.slotId) {
        const oldSlot = await manager.findOne(InterviewSlot, { where: { id: interview.slotId, organizationId: orgId } });
        if (oldSlot && oldSlot.status === 'Booked') {
          oldSlot.status = 'Available';
          oldSlot.updatedBy = actorId;
          await manager.save(oldSlot);
        }
      }

      newSlot.status = 'Booked';
      newSlot.updatedBy = actorId;
      await manager.save(newSlot);

      interview.slotId = newSlot.id;
      interview.status = 'Rescheduled';
      interview.updatedBy = actorId;
      await manager.save(interview);

      const application = await manager.findOne(Application, { where: { id: interview.applicationId, organizationId: orgId } });
      if (application) {
        await this.syncApplicationFlatFields(manager, application, newSlot);
      }

      return interview;
    });
  }

  async cancel(orgId: string, interviewId: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const interview = await manager.findOne(Interview, { where: { id: interviewId, organizationId: orgId } });
      if (!interview) {
        throw new NotFoundException(`Interview #${interviewId} not found`);
      }
      if (['Completed', 'Cancelled'].includes(interview.status)) {
        throw new BadRequestException(`Interview is already ${interview.status}.`);
      }

      if (interview.slotId) {
        const slot = await manager.findOne(InterviewSlot, { where: { id: interview.slotId, organizationId: orgId } });
        if (slot && slot.status === 'Booked') {
          slot.status = 'Available';
          slot.updatedBy = actorId;
          await manager.save(slot);
        }
      }

      interview.status = 'Cancelled';
      interview.updatedBy = actorId;
      return manager.save(interview);
    });
  }

  async markNoShow(orgId: string, interviewId: string, actorId: string) {
    const interview = await this.findOneOrThrow(interviewId, orgId);
    if (['Completed', 'Cancelled'].includes(interview.status)) {
      throw new BadRequestException(`Cannot mark an interview with status "${interview.status}" as no-show.`);
    }
    interview.status = 'No Show';
    interview.updatedBy = actorId;
    return this.interviewRepository.save(interview);
  }

  async markCompleted(orgId: string, interviewId: string, dto: CompleteInterviewDto, actorId: string) {
    const interview = await this.findOneOrThrow(interviewId, orgId);
    if (['Cancelled'].includes(interview.status)) {
      throw new BadRequestException('Cannot complete a cancelled interview.');
    }
    interview.status = 'Completed';
    if (dto.outcome) interview.outcome = dto.outcome;
    interview.updatedBy = actorId;
    return this.interviewRepository.save(interview);
  }

  findAllByOrg(orgId: string, filters?: { applicationId?: string; interviewType?: string; status?: string }) {
    const query = this.interviewRepository
      .createQueryBuilder('interview')
      .leftJoinAndSelect('interview.slot', 'slot')
      .leftJoinAndSelect('interview.application', 'application')
      .where('interview.organization_id = :orgId', { orgId });

    if (filters?.applicationId) {
      query.andWhere('interview.application_id = :applicationId', { applicationId: filters.applicationId });
    }
    if (filters?.interviewType) {
      query.andWhere('interview.interview_type = :interviewType', { interviewType: filters.interviewType });
    }
    if (filters?.status) {
      query.andWhere('interview.status = :status', { status: filters.status });
    }

    query.orderBy('interview.created_at', 'DESC');
    return query.getMany();
  }

  async findOneOrThrow(id: string, orgId: string) {
    const interview = await this.interviewRepository.findOne({
      where: { id, organizationId: orgId },
      relations: ['slot', 'application'],
    });
    if (!interview) {
      throw new NotFoundException(`Interview #${id} not found`);
    }
    return interview;
  }

  // Keeps Application's flat interviewLocation/Date/Time columns (what the
  // GD-Interview list already reads) in sync with whichever slot is
  // currently booked, so B4's list page doesn't need to join through
  // Interview/InterviewSlot itself.
  private async syncApplicationFlatFields(manager: any, application: Application, slot: InterviewSlot) {
    application.interviewLocation = slot.location || application.interviewLocation;
    application.interviewDate = new Date(slot.slotDate);
    application.interviewTime = slot.startTime.toISOString().slice(11, 16);
    await manager.save(application);
  }
}
