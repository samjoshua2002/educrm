import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { Role } from '../../common/enums/roles.enum.js';

import { PaginationDto } from '../../common/dto/pagination.dto.js';

/**
 * Fields that only a Superadmin is allowed to modify.
 * Org Admins may update basic profile info (name, email, phone, address, logoUrl)
 * but NOT status, subscription dates, or slug.
 */
const SUPERADMIN_ONLY_FIELDS = [
  'status',
  'subscriptionStart',
  'subscriptionEnd',
  'slug',
];

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  async create(dto: CreateOrganizationDto, actorId: string): Promise<Organization> {
    const existing = await this.orgRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Organization with slug "${dto.slug}" already exists`);
    }

    const org = this.orgRepo.create({
      ...dto,
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.orgRepo.save(org);
  }

  async findAll(paginationDto: PaginationDto): Promise<{ data: Organization[]; total: number; page: number; limit: number }> {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    
    const [data, total] = await this.orgRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({
      where: { id },
      relations: ['branches'],
    });
    if (!org) {
      throw new NotFoundException(`Organization with ID "${id}" not found`);
    }
    return org;
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    actorId: string,
    actorRole: Role,
  ): Promise<Organization> {
    const org = await this.findOne(id);

    // Strip superadmin-only fields if the actor is an Org Admin
    let sanitizedDto: Partial<UpdateOrganizationDto> = { ...dto };
    if (actorRole === Role.ORG_ADMIN) {
      for (const field of SUPERADMIN_ONLY_FIELDS) {
        if (field in sanitizedDto) {
          delete (sanitizedDto as any)[field];
        }
      }
    }

    // Check slug uniqueness if slug is being changed (Superadmin only)
    const dtoAny = sanitizedDto as any;
    if (dtoAny.slug && dtoAny.slug !== org.slug) {
      const existing = await this.orgRepo.findOne({ where: { slug: dtoAny.slug } });
      if (existing) {
        throw new ConflictException(`Organization with slug "${dtoAny.slug}" already exists`);
      }
    }

    Object.assign(org, sanitizedDto);
    org.updatedBy = actorId;
    return this.orgRepo.save(org);
  }

  async remove(id: string): Promise<void> {
    const org = await this.findOne(id);
    await this.orgRepo.remove(org);
  }
}
