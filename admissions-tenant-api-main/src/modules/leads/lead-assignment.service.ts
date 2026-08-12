import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { Lead } from './entities/lead.entity.js';
import { Role } from '../../common/enums/roles.enum.js';

@Injectable()
export class LeadAssignmentService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
  ) {}

  /**
   * Round-robin assignment to active users of the given role within the lead's organization.
   * Used for new-lead intake (role=LEAD_MANAGER) and for handoff on verification (role=COUNSELOR).
   */
  async assignLead(lead: Lead, role: Role = Role.LEAD_MANAGER) {
    // 1. Find available users with the target role in the organization
    const pool = await this.userRepository.find({
      where: {
        organizationId: lead.organizationId,
        role,
        isActive: true,
      },
    });

    if (pool.length === 0) {
      return null;
    }

    // 2. Simple Round-Robin based on last assignment to a user of this same role
    const lastLead = await this.leadRepository
      .createQueryBuilder('lead')
      .leftJoin('lead.assignedToUser', 'assignedToUser')
      .where('lead.organization_id = :orgId', { orgId: lead.organizationId })
      .andWhere('assignedToUser.role = :role', { role })
      .orderBy('lead.assigned_at', 'DESC')
      .getOne();

    let assignTo: User;

    if (!lastLead || !lastLead.assignedTo) {
      assignTo = pool[0];
    } else {
      const lastIndex = pool.findIndex(c => c.id === lastLead.assignedTo);
      const nextIndex = (lastIndex + 1) % pool.length;
      assignTo = pool[nextIndex];
    }

    return {
      userId: assignTo.id,
      timestamp: new Date(),
    };
  }
}
