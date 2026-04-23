import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
  ) {}

  async findAll(orgId: string, paginationDto: PaginationDto, search?: string) {
    const query = this.leadRepository.createQueryBuilder('lead')
      .where('lead.organization_id = :orgId', { orgId });

    if (search) {
      query.andWhere(
        '(lead.first_name ILIKE :search OR lead.last_name ILIKE :search OR lead.email ILIKE :search OR lead.phone ILIKE :search)',
        { search: `%${search}%` },
      );
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

  async remove(id: string, orgId: string): Promise<void> {
    const lead = await this.findOne(id, orgId);
    await this.leadRepository.remove(lead);
  }
}
