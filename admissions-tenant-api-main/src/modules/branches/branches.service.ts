import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  async create(
    organizationId: string,
    dto: CreateBranchDto,
    actorId: string,
  ): Promise<Branch> {
    const branch = this.branchRepo.create({
      ...dto,
      organizationId,
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.branchRepo.save(branch);
  }

  async findAllByOrg(organizationId: string, paginationDto: PaginationDto): Promise<{ data: Branch[]; total: number; page: number; limit: number }> {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    
    const [data, total] = await this.branchRepo.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string, organizationId: string): Promise<Branch> {
    const branch = await this.branchRepo.findOne({
      where: { id, organizationId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID "${id}" not found`);
    }
    return branch;
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateBranchDto,
    actorId: string,
  ): Promise<Branch> {
    const branch = await this.findOne(id, organizationId);
    Object.assign(branch, dto);
    branch.updatedBy = actorId;
    return this.branchRepo.save(branch);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const branch = await this.findOne(id, organizationId);
    await this.branchRepo.remove(branch);
  }
}
