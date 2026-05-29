import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { LeadActivity } from './entities/lead-activity.entity.js';
import { VerifyLeadDto } from './dto/verify-lead.dto.js';
import { AssignLeadDto } from './dto/assign-lead.dto.js';
import { AddLeadNoteDto } from './dto/add-lead-note.dto.js';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto.js';
import { CloseLeadDto } from './dto/close-lead.dto.js';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../../common/enums/roles.enum.js';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private readonly leadActivityRepository: Repository<LeadActivity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(
    orgId: string,
    paginationDto: PaginationDto,
    search?: string,
    status?: string,
    assignedTo?: string,
    followUpDate?: string,
    scoreBand?: string,
    userId?: string,
  ) {
    const query = this.leadRepository.createQueryBuilder('lead')
      .where('lead.organization_id = :orgId', { orgId });

    if (status) {
      query.andWhere('lead.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(lead.first_name ILIKE :search OR lead.last_name ILIKE :search OR lead.email ILIKE :search OR lead.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (assignedTo) {
      const assignedValue = assignedTo === 'me' ? userId : assignedTo;
      if (assignedValue) {
        query.andWhere('lead.assigned_to = :assignedTo', { assignedTo: assignedValue });
      }
    }

    if (followUpDate) {
      query.andWhere('DATE(lead.next_follow_up_at) = :followUpDate', { followUpDate });
    }

    if (scoreBand) {
      query.andWhere('lead.score_band = :scoreBand', { scoreBand });
    }

    const [data, total] = await query
      .skip(paginationDto.skip)
      .take(paginationDto.limit)
      .orderBy('lead.created_at', 'DESC')
      .getManyAndCount();

    const totalPages = Math.ceil(total / paginationDto.limit);
    return { data, total, totalPages, page: paginationDto.page, limit: paginationDto.limit };
  }

  async findOne(id: string, orgId: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, organizationId: orgId },
    });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    return lead;
  }

  async updateStatus(id: string, orgId: string, status: string): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    const previousStatus = lead.status;
    lead.status = status as LeadStatus;
    const updated = await this.leadRepository.save(lead);
    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      action: 'status_changed',
      content: `Status changed from ${previousStatus} to ${status}`,
      previousStatus,
      newStatus: status,
    });
    return updated;
  }

  async verify(id: string, orgId: string, actorId: string, dto: VerifyLeadDto): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    if (![LeadStatus.UNVERIFIED].includes(lead.status)) {
      throw new BadRequestException('Only unverified leads can be verified');
    }

    const nextStatus = dto.action === 'qualify' ? LeadStatus.VERIFIED : LeadStatus.DISQUALIFIED;
    const previousStatus = lead.status;
    lead.status = nextStatus;
    lead.verifiedBy = actorId;
    lead.verifiedAt = new Date();

    const updated = await this.leadRepository.save(lead);
    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'verified',
      content: dto.reason || `Lead ${dto.action}d`,
      previousStatus,
      newStatus: nextStatus,
    });
    return updated;
  }

  async assign(id: string, orgId: string, actorId: string, dto: AssignLeadDto): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    const counselor = await this.userRepository.findOne({
      where: { id: dto.assignedTo, organizationId: orgId, role: Role.COUNSELOR, isActive: true },
    });
    if (!counselor) {
      throw new BadRequestException('Assigned user must be an active counselor in the same organization');
    }

    const previousAssignedTo = lead.assignedTo;
    lead.assignedTo = dto.assignedTo;
    lead.assignedAt = new Date();
    const updated = await this.leadRepository.save(lead);

    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'assigned',
      content: dto.reason || 'Lead reassigned',
      previousAssignedTo,
      newAssignedTo: dto.assignedTo,
    });
    return updated;
  }

  async addNote(id: string, orgId: string, actorId: string, dto: AddLeadNoteDto): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    if (dto.nextFollowUpAt) {
      lead.nextFollowUpAt = new Date(dto.nextFollowUpAt);
    }
    if (lead.status === LeadStatus.VERIFIED) {
      lead.status = LeadStatus.WORKING;
    }

    const updated = await this.leadRepository.save(lead);
    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'note_added',
      content: dto.content,
      disposition: dto.disposition,
      newStatus: updated.status,
    });
    return updated;
  }

  async updateLeadStatus(id: string, orgId: string, actorId: string, dto: UpdateLeadStatusDto): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    const previousStatus = lead.status;
    lead.status = dto.status as LeadStatus;
    const updated = await this.leadRepository.save(lead);

    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'status_changed',
      content: dto.reason || `Status changed from ${previousStatus} to ${dto.status}`,
      previousStatus,
      newStatus: dto.status,
    });
    return updated;
  }

  async close(id: string, orgId: string, actorId: string, dto: CloseLeadDto): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    const previousStatus = lead.status;
    lead.status = LeadStatus.CLOSED;
    lead.closureReason = dto.reason as any;
    lead.closureNotes = dto.notes || null;
    const updated = await this.leadRepository.save(lead);

    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'closed',
      content: dto.notes || dto.reason,
      previousStatus,
      newStatus: LeadStatus.CLOSED,
    });
    return updated;
  }

  async remove(id: string, orgId: string): Promise<void> {
    const lead = await this.findOne(id, orgId);
    await this.leadRepository.remove(lead);
  }

  private async logActivity(payload: Partial<LeadActivity>): Promise<void> {
    const activity = this.leadActivityRepository.create(payload);
    await this.leadActivityRepository.save(activity);
  }
}
