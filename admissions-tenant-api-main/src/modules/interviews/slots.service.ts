import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterviewSlot } from './entities/interview-slot.entity.js';
import { CreateSlotDto } from './dto/create-slot.dto.js';
import { BulkCreateSlotsDto } from './dto/bulk-create-slots.dto.js';

@Injectable()
export class SlotsService {
  constructor(
    @InjectRepository(InterviewSlot)
    private readonly slotRepository: Repository<InterviewSlot>,
  ) {}

  create(orgId: string, dto: CreateSlotDto, actorId: string) {
    if (new Date(dto.endTime) <= new Date(dto.startTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }
    const slot = this.slotRepository.create({
      ...dto,
      organizationId: orgId,
      status: 'Available',
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.slotRepository.save(slot);
  }

  // Splits [dayStartTime, dayEndTime) into back-to-back slots of
  // slotDurationMinutes each, for one interviewer on one day.
  bulkCreate(orgId: string, dto: BulkCreateSlotsDto, actorId: string) {
    const dayStart = new Date(dto.dayStartTime);
    const dayEnd = new Date(dto.dayEndTime);
    if (dayEnd <= dayStart) {
      throw new BadRequestException('dayEndTime must be after dayStartTime');
    }

    const slots: InterviewSlot[] = [];
    let cursor = new Date(dayStart);
    while (cursor.getTime() + dto.slotDurationMinutes * 60000 <= dayEnd.getTime()) {
      const start = new Date(cursor);
      const end = new Date(cursor.getTime() + dto.slotDurationMinutes * 60000);
      slots.push(
        this.slotRepository.create({
          organizationId: orgId,
          interviewerId: dto.interviewerId,
          interviewType: dto.interviewType,
          slotDate: dto.slotDate,
          startTime: start,
          endTime: end,
          location: dto.location,
          mode: dto.mode,
          meetingLink: dto.meetingLink,
          timeZone: dto.timeZone,
          status: 'Available',
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );
      cursor = end;
    }

    if (slots.length === 0) {
      throw new BadRequestException('No slots fit within the given time window and duration.');
    }

    return this.slotRepository.save(slots);
  }

  findAllByOrg(
    orgId: string,
    filters?: { interviewerId?: string; interviewType?: string; status?: string; dateFrom?: string; dateTo?: string },
  ) {
    const query = this.slotRepository
      .createQueryBuilder('slot')
      .leftJoinAndSelect('slot.interviewer', 'interviewer')
      .where('slot.organization_id = :orgId', { orgId });

    if (filters?.interviewerId) {
      query.andWhere('slot.interviewer_id = :interviewerId', { interviewerId: filters.interviewerId });
    }
    if (filters?.interviewType) {
      query.andWhere('slot.interview_type = :interviewType', { interviewType: filters.interviewType });
    }
    if (filters?.status) {
      query.andWhere('slot.status = :status', { status: filters.status });
    }
    if (filters?.dateFrom) {
      query.andWhere('slot.slot_date >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters?.dateTo) {
      query.andWhere('slot.slot_date <= :dateTo', { dateTo: filters.dateTo });
    }

    query.orderBy('slot.slot_date', 'ASC').addOrderBy('slot.start_time', 'ASC');
    return query.getMany();
  }

  async findOne(id: string, orgId: string) {
    const slot = await this.slotRepository.findOne({
      where: { id, organizationId: orgId },
      relations: ['interviewer'],
    });
    if (!slot) {
      throw new NotFoundException(`Interview slot #${id} not found`);
    }
    return slot;
  }

  async block(id: string, orgId: string, actorId: string) {
    const slot = await this.findOne(id, orgId);
    if (slot.status === 'Booked') {
      throw new BadRequestException('Cannot block a slot that is already booked.');
    }
    slot.status = 'Blocked';
    slot.updatedBy = actorId;
    return this.slotRepository.save(slot);
  }

  async unblock(id: string, orgId: string, actorId: string) {
    const slot = await this.findOne(id, orgId);
    if (slot.status !== 'Blocked') {
      throw new BadRequestException('Only a blocked slot can be unblocked.');
    }
    slot.status = 'Available';
    slot.updatedBy = actorId;
    return this.slotRepository.save(slot);
  }

  async cancel(id: string, orgId: string, actorId: string) {
    const slot = await this.findOne(id, orgId);
    if (slot.status === 'Booked') {
      throw new BadRequestException('Cannot cancel a slot that is booked — cancel or reschedule the interview first.');
    }
    slot.status = 'Cancelled';
    slot.updatedBy = actorId;
    return this.slotRepository.save(slot);
  }
}
