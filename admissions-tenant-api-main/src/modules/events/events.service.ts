import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { AnnouncementEvent } from './entities/event.entity.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(AnnouncementEvent)
    private readonly repo: Repository<AnnouncementEvent>,
  ) {}

  async create(
    orgId: string,
    dto: CreateEventDto,
    userId?: string,
    userName?: string,
  ): Promise<AnnouncementEvent> {
    const item = this.repo.create({
      ...dto,
      organizationId: orgId,
      createdById: userId || null,
      createdByName: userName || 'Admissions Team',
      targetAudience: dto.targetAudience || ['student', 'lead'],
      targetLeadStages: dto.targetLeadStages || [],
    });
    return this.repo.save(item);
  }

  async findAll(
    orgId: string,
    query?: {
      search?: string;
      type?: string;
      category?: string;
      status?: string;
      priority?: string;
      audience?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query?.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query?.limit && query.limit > 0 ? Number(query.limit) : 50;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('e');

    // Scoped to organization (or global orgId if provided)
    if (orgId) {
      qb.where('(e.organization_id = :orgId OR e.organization_id IS NULL)', { orgId });
    }

    if (query?.type && query.type !== 'all') {
      qb.andWhere('e.type = :type', { type: query.type });
    }

    if (query?.category && query.category !== 'all') {
      qb.andWhere('e.category = :category', { category: query.category });
    }

    if (query?.status && query.status !== 'all') {
      qb.andWhere('e.status = :status', { status: query.status });
    }

    if (query?.priority && query.priority !== 'all') {
      qb.andWhere('e.priority = :priority', { priority: query.priority });
    }

    if (query?.search && query.search.trim()) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(e.title) LIKE :search OR LOWER(e.description) LIKE :search OR LOWER(e.venue_location) LIKE :search)',
        { search },
      );
    }

    if (query?.audience && query.audience !== 'all') {
      qb.andWhere('e.target_audience ::jsonb @> :aud', {
        aud: JSON.stringify([query.audience]),
      });
    }

    qb.orderBy('e.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string, orgId?: string): Promise<AnnouncementEvent> {
    const qb = this.repo.createQueryBuilder('e').where('e.id = :id', { id });
    if (orgId) {
      qb.andWhere('(e.organization_id = :orgId OR e.organization_id IS NULL)', { orgId });
    }
    const item = await qb.getOne();
    if (!item) {
      throw new NotFoundException(`Announcement / Event with ID "${id}" not found`);
    }
    return item;
  }

  async update(
    id: string,
    orgId: string,
    dto: UpdateEventDto,
  ): Promise<AnnouncementEvent> {
    const item = await this.findOne(id, orgId);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: string, orgId: string): Promise<{ success: boolean; id: string }> {
    const item = await this.findOne(id, orgId);
    await this.repo.remove(item);
    return { success: true, id };
  }

  async broadcast(id: string, orgId: string) {
    const item = await this.findOne(id, orgId);
    item.status = 'Published';
    await this.repo.save(item);
    return {
      success: true,
      message: `Announcement "${item.title}" broadcast initiated successfully.`,
      item,
    };
  }
}
