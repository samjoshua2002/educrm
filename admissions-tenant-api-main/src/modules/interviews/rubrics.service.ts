import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationRubric } from './entities/evaluation-rubric.entity.js';
import { CreateRubricDto } from './dto/create-rubric.dto.js';
import { UpdateRubricDto } from './dto/update-rubric.dto.js';

@Injectable()
export class RubricsService {
  constructor(
    @InjectRepository(EvaluationRubric)
    private readonly rubricRepository: Repository<EvaluationRubric>,
  ) {}

  create(orgId: string, dto: CreateRubricDto, actorId: string) {
    const rubric = this.rubricRepository.create({
      ...dto,
      organizationId: orgId,
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.rubricRepository.save(rubric);
  }

  findAllByOrg(orgId: string, interviewType?: string) {
    return this.rubricRepository.find({
      where: {
        organizationId: orgId,
        ...(interviewType ? { interviewType } : {}),
      },
      order: { interviewType: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string, orgId: string) {
    const rubric = await this.rubricRepository.findOne({ where: { id, organizationId: orgId } });
    if (!rubric) {
      throw new NotFoundException(`Rubric #${id} not found`);
    }
    return rubric;
  }

  async update(id: string, orgId: string, dto: UpdateRubricDto, actorId: string) {
    const rubric = await this.findOne(id, orgId);
    Object.assign(rubric, dto);
    rubric.updatedBy = actorId;
    return this.rubricRepository.save(rubric);
  }

  async deactivate(id: string, orgId: string, actorId: string) {
    const rubric = await this.findOne(id, orgId);
    rubric.isActive = false;
    rubric.updatedBy = actorId;
    return this.rubricRepository.save(rubric);
  }
}
