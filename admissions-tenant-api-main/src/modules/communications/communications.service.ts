import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunicationLog } from './entities/communication-log.entity.js';
import { CreateCommunicationLogDto } from './dto/create-communication-log.dto.js';

@Injectable()
export class CommunicationsService {
  constructor(
    @InjectRepository(CommunicationLog)
    private readonly repo: Repository<CommunicationLog>,
  ) {}

  async create(dto: CreateCommunicationLogDto): Promise<CommunicationLog> {
    const log = this.repo.create({
      organizationId: dto.organizationId ?? null,
      applicationNo: dto.applicationNo ?? null,
      applicantName: dto.applicantName ?? null,
      recipientEmail: dto.recipientEmail ?? null,
      recipientPhone: dto.recipientPhone ?? null,
      channel: dto.channel || 'Email',
      category: dto.category ?? null,
      categoryId: dto.categoryId ?? null,
      templateId: dto.templateId ?? null,
      subject: dto.subject,
      content: dto.content,
      footer: dto.footer ?? null,
      sender: dto.sender ?? null,
      status: dto.status || 'Sent',
      messageId: dto.messageId ?? null,
    });
    return this.repo.save(log);
  }

  async findAll(
    orgId?: string,
    applicationNo?: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: CommunicationLog[]; total: number; page: number; limit: number }> {
    const qb = this.repo.createQueryBuilder('log');

    if (orgId) {
      qb.andWhere('(log.organization_id = :orgId OR log.organization_id IS NULL)', { orgId });
    }
    if (applicationNo) {
      qb.andWhere('log.application_no = :applicationNo', { applicationNo });
    }

    qb.orderBy('log.sent_at', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // Accepts either a communication log UUID, or an application number — the
  // frontend's conversation-history page addresses this route by whichever
  // it has on hand (e.g. /communications/APP2026006), so this resolves both.
  async findOne(idOrApplicationNo: string): Promise<CommunicationLog> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrApplicationNo,
    );

    const log = isUuid
      ? await this.repo.findOne({ where: { id: idOrApplicationNo } })
      : await this.repo.findOne({
          where: { applicationNo: idOrApplicationNo },
          order: { sentAt: 'DESC' },
        });

    if (!log) {
      throw new NotFoundException(`Communication log "${idOrApplicationNo}" not found`);
    }
    return log;
  }
}
