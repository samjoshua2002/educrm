import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  create(orgId: string, dto: CreateLocationDto, actorId: string) {
    const location = this.locationRepository.create({
      ...dto,
      organizationId: orgId,
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.locationRepository.save(location);
  }

  findAllByOrg(orgId: string, filters?: { type?: string; isActive?: boolean; search?: string }) {
    const query = this.locationRepository.createQueryBuilder('location').where('location.organization_id = :orgId', { orgId });

    if (filters?.type) {
      query.andWhere('location.type = :type', { type: filters.type });
    }
    if (filters?.isActive !== undefined) {
      query.andWhere('location.is_active = :isActive', { isActive: filters.isActive });
    }
    if (filters?.search) {
      query.andWhere('(location.name ILIKE :search OR location.city ILIKE :search)', { search: `%${filters.search}%` });
    }

    query.orderBy('location.created_at', 'DESC');
    return query.getMany();
  }

  async findOne(id: string, orgId: string) {
    const location = await this.locationRepository.findOne({ where: { id, organizationId: orgId } });
    if (!location) {
      throw new NotFoundException(`Location #${id} not found`);
    }
    return location;
  }

  async update(id: string, orgId: string, dto: UpdateLocationDto, actorId: string) {
    const location = await this.findOne(id, orgId);
    Object.assign(location, dto);
    location.updatedBy = actorId;
    return this.locationRepository.save(location);
  }

  async remove(id: string, orgId: string, actorId: string) {
    const location = await this.findOne(id, orgId);
    location.isActive = false;
    location.updatedBy = actorId;
    return this.locationRepository.save(location);
  }

  async hardDelete(id: string, orgId: string) {
    const location = await this.findOne(id, orgId);
    await this.locationRepository.remove(location);
    return { message: 'Location permanently deleted.' };
  }
}
