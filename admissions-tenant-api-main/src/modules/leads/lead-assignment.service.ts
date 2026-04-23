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

  async assignLead(lead: Lead) {
    // 1. Find available counselors in the organization
    const counselors = await this.userRepository.find({
      where: {
        organizationId: lead.organizationId,
        role: Role.COUNSELOR, // Only assign to counselors
        isActive: true,
      },
    });

    if (counselors.length === 0) {
      return null;
    }

    // 2. Simple Round-Robin based on last assignment
    // Find who has the fewest leads assigned or just pick one randomly for now
    // A better way is to check the last lead's assignedTo.
    const lastLead = await this.leadRepository.findOne({
      where: { organizationId: lead.organizationId },
      order: { assignedAt: 'DESC' },
    });

    let assignTo: User;

    if (!lastLead || !lastLead.assignedTo) {
      assignTo = counselors[0];
    } else {
      const lastIndex = counselors.findIndex(c => c.id === lastLead.assignedTo);
      const nextIndex = (lastIndex + 1) % counselors.length;
      assignTo = counselors[nextIndex];
    }

    return {
      userId: assignTo.id,
      timestamp: new Date(),
    };
  }
}
