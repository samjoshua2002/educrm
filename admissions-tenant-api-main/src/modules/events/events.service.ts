import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { AnnouncementEvent } from './entities/event.entity.js';
import { CreateEventDto, AudiencePreviewDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { EventDeliveryService, STAFF_ROLES } from './event-delivery.service.js';

export interface EventViewer {
  sub?: string;
  role?: string;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private publishing = false;

  constructor(
    @InjectRepository(AnnouncementEvent)
    private readonly repo: Repository<AnnouncementEvent>,
    private readonly delivery: EventDeliveryService,
  ) {}

  /** Exact publish moment from the DTO (ISO) or from date + time (server local time). */
  private scheduledAt(dto: Partial<CreateEventDto>): Date | null | undefined {
    if (dto.scheduledPublishAt) {
      const d = new Date(dto.scheduledPublishAt);
      if (!isNaN(d.getTime())) return d;
    }
    if (dto.scheduledPublishDate) {
      const d = new Date(`${dto.scheduledPublishDate}T${dto.scheduledPublishTime || '09:00'}:00`);
      if (!isNaN(d.getTime())) return d;
    }
    if (dto.scheduledPublishDate === '' || dto.scheduledPublishAt === '') return null;
    return undefined;
  }

  private clean(dto: Partial<CreateEventDto>) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { targetCourseName, publishMode, scheduledPublishAt, ...rest } = dto as any;
    return rest as Partial<AnnouncementEvent>;
  }

  async create(
    orgId: string,
    dto: CreateEventDto,
    userId?: string,
    userName?: string,
  ): Promise<AnnouncementEvent & { delivery?: any }> {
    const item = this.repo.create(this.clean(dto));
    item.organizationId = orgId;
    item.createdById = userId || null;
    item.createdByName = dto.createdByName || userName || 'Admissions Team';
    item.targetAudience = dto.targetAudience && dto.targetAudience.length ? dto.targetAudience : ['all'];
    item.targetLeadStages = dto.targetLeadStages || [];
    item.targetLeadSources = dto.targetLeadSources || [];
    item.targetApplicationStatuses = dto.targetApplicationStatuses || [];
    item.targetBranchIds = dto.targetBranchIds || [];
    item.targetAcademicSession = dto.targetAcademicSession || null;
    item.targetCourseId = dto.targetCourseId && dto.targetCourseId !== 'all' ? dto.targetCourseId : null;
    const at = this.scheduledAt(dto);
    item.scheduledPublishAt = at ?? null;
    item.status = item.status || 'Published';
    if (item.status === 'Published') {
      item.publishedAt = new Date();
      item.deliveryStatus = 'pending';
    } else if (item.status === 'Scheduled') {
      item.deliveryStatus = 'pending';
    }
    const saved = await this.repo.save(item);

    if (saved.status === 'Published') {
      const delivery = await this.safeDeliver(saved, 'publish');
      return Object.assign(saved, { delivery });
    }
    return saved;
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
    viewer?: EventViewer,
  ) {
    const page = query?.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query?.limit && query.limit > 0 ? Number(query.limit) : 50;
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('e');

    // Scoped to organization (or global orgId if provided)
    if (orgId) {
      qb.where('(e.organization_id = :orgId OR e.organization_id IS NULL)', { orgId });
    }

    // Students only see published items addressed to students / applicants / everyone.
    if (viewer?.role === 'student') {
      qb.andWhere("e.status = 'Published'").andWhere(
        `(e.target_audience @> '["all"]'::jsonb OR e.target_audience @> '["student"]'::jsonb OR e.target_audience @> '["applicant"]'::jsonb OR e.target_audience @> '["lead"]'::jsonb OR e.target_audience = '[]'::jsonb)`,
      );
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
      if (query.audience === 'staff') {
        qb.andWhere(
          `(e.target_audience @> '["all"]'::jsonb OR e.target_audience @> '["staff"]'::jsonb OR e.target_audience ?| ARRAY[:...staffRoles])`,
          { staffRoles: STAFF_ROLES },
        );
      } else {
        qb.andWhere('e.target_audience ::jsonb @> :aud', {
          aud: JSON.stringify([query.audience]),
        });
      }
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
  ): Promise<AnnouncementEvent & { delivery?: any }> {
    const item = await this.findOne(id, orgId);
    const wasPublished = item.status === 'Published';
    Object.assign(item, this.clean(dto));
    if (dto.targetCourseId !== undefined) {
      item.targetCourseId = dto.targetCourseId && dto.targetCourseId !== 'all' ? dto.targetCourseId : null;
    }
    if (dto.targetAcademicSession !== undefined) item.targetAcademicSession = dto.targetAcademicSession || null;
    const at = this.scheduledAt(dto);
    if (at !== undefined) item.scheduledPublishAt = at;
    if (item.status === 'Scheduled' && !item.lastDeliveredAt) item.deliveryStatus = 'pending';

    const becamePublished = !wasPublished && item.status === 'Published';
    if (becamePublished) {
      item.publishedAt = new Date();
    }
    const saved = await this.repo.save(item);

    // First publish of a draft / scheduled item delivers it.
    if (becamePublished && !saved.lastDeliveredAt) {
      const delivery = await this.safeDeliver(saved, 'publish');
      return Object.assign(saved, { delivery });
    }
    return saved;
  }

  async remove(id: string, orgId: string): Promise<{ success: boolean; id: string }> {
    const item = await this.findOne(id, orgId);
    await this.repo.remove(item);
    return { success: true, id };
  }

  /** Publish (if needed) and (re)send through the selected channels. */
  async broadcast(id: string, orgId: string) {
    const item = await this.findOne(id, orgId);
    if (item.status !== 'Published') {
      item.status = 'Published';
      item.publishedAt = new Date();
      await this.repo.save(item);
    }
    const delivery = await this.safeDeliver(item, 'broadcast');
    const r: Record<string, number> = (delivery as any)?.recipients || {};
    return {
      success: !!delivery?.started,
      message: delivery?.started
        ? `"${item.title}" is being sent to ${r.staff || 0} staff, ${r.students || 0} students, ${r.leads || 0} leads and ${r.applicants || 0} applicants.`
        : `"${item.title}" was published but could not be delivered: ${delivery?.reason || 'unknown error'}`,
      delivery,
      item,
    };
  }

  previewAudience(orgId: string, dto: AudiencePreviewDto) {
    return this.delivery.previewAudience(orgId, dto);
  }

  private async safeDeliver(item: AnnouncementEvent, reason: 'publish' | 'broadcast' | 'schedule') {
    try {
      return await this.delivery.deliver(item, reason);
    } catch (err) {
      this.logger.error(`Delivery of "${item.title}" could not start: ${(err as Error).message}`);
      await this.repo.update(item.id, { deliveryStatus: 'failed' }).catch(() => undefined);
      return { started: false, reason: (err as Error).message };
    }
  }

  /** Publishes scheduled announcements / events whose time has come, then delivers them. */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduled() {
    if (this.publishing) return;
    this.publishing = true;
    try {
      const due = await this.repo
        .createQueryBuilder('e')
        .where("e.status = 'Scheduled'")
        .andWhere(
          `(e.scheduled_publish_at <= now()
            OR (e.scheduled_publish_at IS NULL AND CASE
                  WHEN e.scheduled_publish_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                   AND COALESCE(NULLIF(e.scheduled_publish_time, ''), '09:00') ~ '^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$'
                  THEN (e.scheduled_publish_date || ' ' || COALESCE(NULLIF(e.scheduled_publish_time, ''), '09:00'))::timestamp <= now()::timestamp
                  ELSE false END))`,
        )
        .take(20)
        .getMany();

      for (const item of due) {
        // Claim the row so a second instance does not publish it twice.
        const claim = await this.repo
          .createQueryBuilder()
          .update(AnnouncementEvent)
          .set({ status: 'Published', publishedAt: () => 'now()' })
          .where('id = :id AND status = :status', { id: item.id, status: 'Scheduled' })
          .execute();
        if (!claim.affected) continue;
        item.status = 'Published';
        item.publishedAt = new Date();
        this.logger.log(`Publishing scheduled ${item.type} "${item.title}"`);
        await this.safeDeliver(item, 'schedule');
      }
    } catch (err) {
      this.logger.error(`Scheduled publish run failed: ${(err as Error).message}`);
    } finally {
      this.publishing = false;
    }
  }
}
