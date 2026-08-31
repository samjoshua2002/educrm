import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity.js';
import { LeadQueryDto } from './dto/lead-query.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { LeadActivity } from './entities/lead-activity.entity.js';
import { VerifyLeadDto } from './dto/verify-lead.dto.js';
import { AssignLeadDto } from './dto/assign-lead.dto.js';
import { AddLeadNoteDto } from './dto/add-lead-note.dto.js';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto.js';
import { CloseLeadDto } from './dto/close-lead.dto.js';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../../common/enums/roles.enum.js';
import { LeadAssignmentService } from './lead-assignment.service.js';
import { MailerService } from '../notifications/mailer.service.js';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private readonly leadActivityRepository: Repository<LeadActivity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly assignmentService: LeadAssignmentService,
    private readonly mailerService: MailerService,
  ) {}

  async create(orgId: string, dto: any): Promise<Lead> {
    const leadData = this.leadRepository.create({
      ...dto,
      organizationId: orgId,
    } as Partial<Lead>);
    const saved = await this.leadRepository.save(leadData);
    
    await this.logActivity({
      leadId: saved.id,
      organizationId: saved.organizationId,
      action: 'created',
      content: 'Lead created manually',
      newStatus: saved.status,
    });
    
    return saved;
  }

  async update(id: string, orgId: string, actorId: string, dto: any, role?: Role): Promise<Lead> {
    const lead = await this.findOne(id, orgId, actorId, role);
    Object.assign(lead, dto);
    const updated = await this.leadRepository.save(lead);
    
    await this.logActivity({
      leadId: updated.id,
      organizationId: updated.organizationId,
      actorId,
      action: 'updated',
      content: 'Lead updated manually',
      newStatus: updated.status,
    });
    
    return updated;
  }

  async findAll(
    orgId: string,
    queryDto: LeadQueryDto,
    userId?: string,
    role?: Role,
  ) {
    const query = this.leadRepository.createQueryBuilder('lead')
      .leftJoin('lead.assignedToUser', 'assignedToUser')
      .addSelect(['assignedToUser.id', 'assignedToUser.name', 'assignedToUser.role'])
      .where('lead.organization_id = :orgId', { orgId });

    if (queryDto.status) {
      query.andWhere('lead.status = :status', { status: queryDto.status });
    }

    if (queryDto.search) {
      query.andWhere(
        '(lead.first_name ILIKE :search OR lead.last_name ILIKE :search OR lead.email ILIKE :search OR lead.phone ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    // Counselors can only ever see their own assigned leads — enforced server-side,
    // ignoring/overriding any client-supplied assignedTo value.
    if (role === Role.COUNSELOR) {
      query.andWhere('lead.assigned_to = :assignedTo', { assignedTo: userId });
    } else if (queryDto.assignedTo) {
      const assignedValue = queryDto.assignedTo === 'me' ? userId : queryDto.assignedTo;
      if (assignedValue) {
        query.andWhere('lead.assigned_to = :assignedTo', { assignedTo: assignedValue });
      }
    }

    if (queryDto.followUpDate) {
      query.andWhere('DATE(lead.next_follow_up_at) = :followUpDate', { followUpDate: queryDto.followUpDate });
    }

    if (queryDto.scoreBand) {
      query.andWhere('lead.score_band = :scoreBand', { scoreBand: queryDto.scoreBand });
    }

    if (queryDto.state) {
      query.andWhere('lead.state = :state', { state: queryDto.state });
    }

    if (queryDto.city) {
      query.andWhere('lead.city = :city', { city: queryDto.city });
    }

    if (queryDto.source) {
      query.andWhere('lead.source = :source', { source: queryDto.source });
    }

    if (queryDto.stage) {
      query.andWhere("lead.raw_payload->>'stage' = :stage", { stage: queryDto.stage });
    }

    const [data, total] = await query
      .skip(queryDto.skip)
      .take(queryDto.limit)
      .orderBy('lead.createdAt', 'DESC')
      .getManyAndCount();

    const totalPages = Math.ceil(total / queryDto.limit);
    return { data, total, totalPages, page: queryDto.page, limit: queryDto.limit };
  }

  async findOne(
    id: string,
    orgId: string,
    userId?: string,
    role?: Role,
  ): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, organizationId: orgId },
      relations: ['branch', 'form'],
    });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    if (role === Role.COUNSELOR && lead.assignedTo !== userId) {
      throw new ForbiddenException('You can only view leads assigned to you');
    }
    return lead;
  }

  async updateStatus(id: string, orgId: string, status: string, actorId?: string): Promise<Lead> {
    const lead = await this.findOne(id, orgId);
    const previousStatus = lead.status;
    lead.status = status as LeadStatus;

    let assignmentNote = '';
    if (status === LeadStatus.VERIFIED) {
      lead.verifiedBy = actorId || lead.verifiedBy;
      lead.verifiedAt = new Date();
      await this.processStudentVerification(lead);

      const assignment = await this.assignmentService.assignLead(lead, Role.COUNSELOR);
      if (assignment) {
        lead.assignedTo = assignment.userId;
        lead.assignedAt = assignment.timestamp;
        assignmentNote = ' and reassigned to a counselor';
      }
    }

    const updated = await this.leadRepository.save(lead);
    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'status_changed',
      content: `Status changed from ${previousStatus} to ${status}${assignmentNote}`,
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

    let assignmentNote = '';
    if (nextStatus === LeadStatus.VERIFIED) {
      await this.processStudentVerification(lead);

      const assignment = await this.assignmentService.assignLead(lead, Role.COUNSELOR);
      if (assignment) {
        const previousAssignedTo = lead.assignedTo;
        lead.assignedTo = assignment.userId;
        lead.assignedAt = assignment.timestamp;
        assignmentNote = previousAssignedTo !== assignment.userId ? ' and reassigned to a counselor' : '';
      }
    }

    const updated = await this.leadRepository.save(lead);
    await this.logActivity({
      leadId: lead.id,
      organizationId: lead.organizationId,
      actorId,
      action: 'verified',
      content: `${dto.reason || `Lead ${dto.action}d`}${assignmentNote}`,
      previousStatus,
      newStatus: nextStatus,
    });
    return updated;
  }

  private async processStudentVerification(lead: Lead): Promise<void> {
    lead.rawPayload = { ...(lead.rawPayload || {}), stage: 'Verified' };
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const studentEmail = lead.email;
    const studentName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || studentEmail || 'Student';

    if (studentEmail) {
      let user = await this.userRepository.findOne({ where: { email: studentEmail } });
      if (!user) {
        user = this.userRepository.create({
          name: studentName,
          email: studentEmail,
          phone: lead.phone || undefined,
          role: Role.STUDENT,
          organizationId: lead.organizationId,
          oneTimePassword: otp,
          isActive: true,
        });
      } else {
        user.oneTimePassword = otp;
      }
      await this.userRepository.save(user);

      await this.mailerService.sendStudentVerificationOtpEmail(studentEmail, studentName, otp);
    }
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

  async addNote(id: string, orgId: string, actorId: string, dto: AddLeadNoteDto, role?: Role): Promise<Lead> {
    const lead = await this.findOne(id, orgId, actorId, role);
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

  async updateLeadStatus(id: string, orgId: string, actorId: string, dto: UpdateLeadStatusDto, role?: Role): Promise<Lead> {
    const lead = await this.findOne(id, orgId, actorId, role);
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

  async close(id: string, orgId: string, actorId: string, dto: CloseLeadDto, role?: Role): Promise<Lead> {
    const lead = await this.findOne(id, orgId, actorId, role);
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
