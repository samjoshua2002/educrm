import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { InAppNotification } from './entities/in-app-notification.entity.js';

export interface NotifyInput {
  /** null/undefined = platform-level (superadmin) notification */
  organizationId?: string | null;
  recipientUserId?: string | null;
  /**
   * Role (or comma-separated roles, e.g. "counselor,lead_manager") that
   * should see the notification inside organizationId.
   */
  recipientRole?: string | null;
  module: string;
  type?: string;
  severity?: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  body?: string | null;
  link?: string | null;
  relatedEntityId?: string | null;
  metadata?: Record<string, any> | null;
}

/** The authenticated caller, as put on the request by JwtStrategy. */
export interface NotificationViewer {
  sub: string;
  role: string;
  organizationId: string | null;
}

export interface NotificationListQuery {
  module?: string;
  severity?: string;
  /** 'unread' | 'read' | 'all' */
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class InAppNotificationsService {
  private readonly logger = new Logger(InAppNotificationsService.name);

  constructor(
    @InjectRepository(InAppNotification)
    private readonly repo: Repository<InAppNotification>,
  ) {}

  /**
   * Create a notification. Never throws — a failed notification must not
   * break the business action that triggered it.
   */
  async notify(input: NotifyInput): Promise<InAppNotification | null> {
    try {
      const entity = this.repo.create({
        organizationId: input.organizationId ?? null,
        recipientUserId: input.recipientUserId ?? null,
        recipientRole: input.recipientRole ?? null,
        module: input.module,
        type: input.type ?? 'general',
        severity: input.severity ?? 'info',
        title: (input.title || '').slice(0, 255),
        body: input.body ?? null,
        link: input.link ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        metadata: input.metadata ?? null,
        readBy: [],
      });
      return await this.repo.save(entity);
    } catch (err) {
      this.logger.error(`Failed to create notification "${input.title}": ${(err as Error).message}`);
      return null;
    }
  }

  /** Bulk variant of notify() (one row per input). Never throws; returns rows created. */
  async notifyMany(inputs: NotifyInput[]): Promise<number> {
    if (!inputs.length) return 0;
    try {
      const rows = inputs.map((input) =>
        this.repo.create({
          organizationId: input.organizationId ?? null,
          recipientUserId: input.recipientUserId ?? null,
          recipientRole: input.recipientRole ?? null,
          module: input.module,
          type: input.type ?? 'general',
          severity: input.severity ?? 'info',
          title: (input.title || '').slice(0, 255),
          body: input.body ?? null,
          link: input.link ?? null,
          relatedEntityId: input.relatedEntityId ?? null,
          metadata: input.metadata ?? null,
          readBy: [],
        }),
      );
      let saved = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        await this.repo.save(chunk);
        saved += chunk.length;
      }
      return saved;
    } catch (err) {
      this.logger.error(`Failed to create ${inputs.length} notifications: ${(err as Error).message}`);
      return 0;
    }
  }

  /**
   * True when a notification with this type (and related entity) was already
   * created inside the window — used to de-duplicate cron-generated alerts.
   */
  async existsRecent(
    type: string,
    relatedEntityId: string | null,
    withinHours: number,
    organizationId?: string | null,
  ): Promise<boolean> {
    try {
      const qb = this.repo
        .createQueryBuilder('n')
        .where('n.type = :type', { type })
        .andWhere('n.created_at >= :since', {
          since: new Date(Date.now() - withinHours * 3600 * 1000),
        });
      if (relatedEntityId) qb.andWhere('n.related_entity_id = :rid', { rid: relatedEntityId });
      if (organizationId === null) qb.andWhere('n.organization_id IS NULL');
      else if (organizationId) qb.andWhere('n.organization_id = :oid', { oid: organizationId });
      return (await qb.getCount()) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Audience rules applied for the viewer:
   *  - superadmin: platform notifications (organization_id IS NULL) that are
   *    not addressed to someone else.
   *  - student: only notifications addressed to them, or to role "student"
   *    in their organization (staff broadcasts are never shown to students).
   *  - staff: notifications addressed to them, plus organization broadcasts
   *    with no role or with their role (recipient_role may list several
   *    comma-separated roles).
   */
  private scopedQuery(viewer: NotificationViewer): SelectQueryBuilder<InAppNotification> {
    const qb = this.repo.createQueryBuilder('n');
    const uid = viewer.sub;
    const role = viewer.role;

    if (role === 'superadmin') {
      qb.where('n.organization_id IS NULL').andWhere(
        new Brackets((b) => {
          b.where('n.recipient_user_id = :uid', { uid }).orWhere(
            new Brackets((b2) => {
              b2.where('n.recipient_user_id IS NULL').andWhere(
                "(n.recipient_role IS NULL OR :role = ANY(string_to_array(REPLACE(n.recipient_role, ' ', ''), ',')))",
                { role },
              );
            }),
          );
        }),
      );
      return qb;
    }

    qb.where(
      new Brackets((b) => {
        b.where('n.recipient_user_id = :uid', { uid }).orWhere(
          new Brackets((b2) => {
            b2.where('n.recipient_user_id IS NULL')
              .andWhere('n.organization_id = :orgId', { orgId: viewer.organizationId })
              .andWhere(
                role === 'student'
                  ? "n.recipient_role IS NOT NULL AND :role = ANY(string_to_array(REPLACE(n.recipient_role, ' ', ''), ','))"
                  : "(n.recipient_role IS NULL OR :role = ANY(string_to_array(REPLACE(n.recipient_role, ' ', ''), ',')))",
                { role },
              );
          }),
        );
      }),
    );
    return qb;
  }

  async listForUser(viewer: NotificationViewer, query: NotificationListQuery) {
    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = Math.min(query.limit && query.limit > 0 ? Number(query.limit) : 20, 100);
    const qb = this.scopedQuery(viewer);

    if (query.module && query.module !== 'all') qb.andWhere('n.module = :module', { module: query.module });
    if (query.severity && query.severity !== 'all') qb.andWhere('n.severity = :severity', { severity: query.severity });
    if (query.status === 'unread') {
      qb.andWhere('NOT (n.read_by @> CAST(:me AS jsonb))', { me: JSON.stringify([viewer.sub]) });
    } else if (query.status === 'read') {
      qb.andWhere('n.read_by @> CAST(:me AS jsonb)', { me: JSON.stringify([viewer.sub]) });
    }
    if (query.search && query.search.trim()) {
      qb.andWhere('(LOWER(n.title) LIKE :s OR LOWER(COALESCE(n.body, \'\')) LIKE :s)', {
        s: `%${query.search.trim().toLowerCase()}%`,
      });
    }

    qb.orderBy('n.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((n) => this.toDto(n, viewer.sub)),
      total,
      page,
      limit,
    };
  }

  async unreadCount(viewer: NotificationViewer): Promise<{ unread: number; critical: number }> {
    const qb = this.scopedQuery(viewer).andWhere('NOT (n.read_by @> CAST(:me AS jsonb))', {
      me: JSON.stringify([viewer.sub]),
    });
    const unread = await qb.clone().getCount();
    const critical = await qb.clone().andWhere("n.severity = 'critical'").getCount();
    return { unread, critical };
  }

  /** Per-module unread counts for the filters on the notifications page. */
  async summary(viewer: NotificationViewer) {
    const rows = await this.scopedQuery(viewer)
      .select('n.module', 'module')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN n.read_by @> '${JSON.stringify([viewer.sub]).replace(/'/g, "''")}'::jsonb THEN 0 ELSE 1 END)`,
        'unread',
      )
      .groupBy('n.module')
      .getRawMany();
    return rows.map((r) => ({ module: r.module, total: Number(r.total) || 0, unread: Number(r.unread) || 0 }));
  }

  async markRead(viewer: NotificationViewer, id: string) {
    const n = await this.scopedQuery(viewer).andWhere('n.id = :id', { id }).getOne();
    if (!n) throw new NotFoundException('Notification not found');
    const readBy = Array.isArray(n.readBy) ? n.readBy : [];
    if (!readBy.includes(viewer.sub)) {
      n.readBy = [...readBy, viewer.sub];
      await this.repo.save(n);
    }
    return this.toDto(n, viewer.sub);
  }

  async markUnread(viewer: NotificationViewer, id: string) {
    const n = await this.scopedQuery(viewer).andWhere('n.id = :id', { id }).getOne();
    if (!n) throw new NotFoundException('Notification not found');
    n.readBy = (Array.isArray(n.readBy) ? n.readBy : []).filter((u) => u !== viewer.sub);
    await this.repo.save(n);
    return this.toDto(n, viewer.sub);
  }

  async markAllRead(viewer: NotificationViewer, module?: string) {
    const qb = this.scopedQuery(viewer)
      .select('n.id', 'id')
      .andWhere('NOT (n.read_by @> CAST(:me AS jsonb))', { me: JSON.stringify([viewer.sub]) });
    if (module && module !== 'all') qb.andWhere('n.module = :module', { module });
    const ids: string[] = (await qb.getRawMany()).map((r) => r.id);
    if (!ids.length) return { updated: 0 };
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      await this.repo
        .createQueryBuilder()
        .update(InAppNotification)
        .set({ readBy: () => `read_by || '${JSON.stringify([viewer.sub]).replace(/'/g, "''")}'::jsonb` })
        .whereInIds(chunk)
        .execute();
    }
    return { updated: ids.length };
  }

  private toDto(n: InAppNotification, userId: string) {
    return {
      id: n.id,
      organizationId: n.organizationId,
      module: n.module,
      type: n.type,
      severity: n.severity,
      title: n.title,
      body: n.body,
      link: n.link,
      relatedEntityId: n.relatedEntityId,
      metadata: n.metadata,
      recipientRole: n.recipientRole,
      isRead: Array.isArray(n.readBy) && n.readBy.includes(userId),
      createdAt: n.createdAt,
    };
  }
}
