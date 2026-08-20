import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShortlistingRule } from './entities/shortlisting-rule.entity.js';
import { CreateShortlistingRuleDto } from './dto/create-shortlisting-rule.dto.js';
import { UpdateShortlistingRuleDto } from './dto/update-shortlisting-rule.dto.js';

@Injectable()
export class ShortlistingRulesService {
  constructor(
    @InjectRepository(ShortlistingRule)
    private readonly ruleRepository: Repository<ShortlistingRule>,
  ) {}

  create(orgId: string, dto: CreateShortlistingRuleDto, actorId: string) {
    const rule = this.ruleRepository.create({
      ...dto,
      organizationId: orgId,
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.ruleRepository.save(rule);
  }

  findAllByOrg(orgId: string, filters?: { program?: string; academicYear?: string; status?: string }) {
    const query = this.ruleRepository.createQueryBuilder('rule')
      .where('rule.organization_id = :orgId', { orgId });

    if (filters?.program) {
      query.andWhere('rule.program = :program', { program: filters.program });
    }
    if (filters?.academicYear) {
      query.andWhere('rule.academic_year = :academicYear', { academicYear: filters.academicYear });
    }
    if (filters?.status) {
      query.andWhere('rule.status = :status', { status: filters.status });
    }

    query.orderBy('rule.created_at', 'DESC');
    return query.getMany();
  }

  async findOne(id: string, orgId: string) {
    const rule = await this.ruleRepository.findOne({ where: { id, organizationId: orgId } });
    if (!rule) {
      throw new NotFoundException(`Shortlisting rule #${id} not found`);
    }
    return rule;
  }

  async update(id: string, orgId: string, dto: UpdateShortlistingRuleDto, actorId: string) {
    const rule = await this.findOne(id, orgId);
    Object.assign(rule, dto);
    rule.updatedBy = actorId;
    return this.ruleRepository.save(rule);
  }

  async deactivate(id: string, orgId: string, actorId: string) {
    const rule = await this.findOne(id, orgId);
    rule.status = 'inactive';
    rule.updatedBy = actorId;
    return this.ruleRepository.save(rule);
  }
}
