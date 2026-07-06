import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AcademicSession } from './entities/academic-session.entity.js';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto.js';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto.js';

@Injectable()
export class AcademicSessionsService {
  constructor(
    @InjectRepository(AcademicSession)
    private readonly academicSessionRepository: Repository<AcademicSession>,
    private readonly dataSource: DataSource,
  ) {}

  async create(orgId: string, createAcademicSessionDto: CreateAcademicSessionDto, actorId: string) {
    const existing = await this.academicSessionRepository.findOne({
      where: { organizationId: orgId, name: createAcademicSessionDto.name }
    });

    if (existing) {
      throw new BadRequestException('An academic session with this name already exists for this organization.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (createAcademicSessionDto.isCurrent) {
        await queryRunner.manager.update(
          AcademicSession,
          { organizationId: orgId, isCurrent: true },
          { isCurrent: false, updatedBy: actorId }
        );
      }

      const session = this.academicSessionRepository.create({
        ...createAcademicSessionDto,
        organizationId: orgId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      const saved = await queryRunner.manager.save(session);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllByOrg(orgId: string) {
    return this.academicSessionRepository.find({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
    });
  }

  async findCurrentSession(orgId: string) {
    const session = await this.academicSessionRepository.findOne({
      where: { organizationId: orgId, isCurrent: true },
    });
    if (!session) {
      throw new NotFoundException(`Current academic session not found for organization ${orgId}`);
    }
    return session;
  }

  async findOne(id: string, orgId: string) {
    const session = await this.academicSessionRepository.findOne({
      where: { id, organizationId: orgId },
    });
    if (!session) {
      throw new NotFoundException(`Academic session #${id} not found`);
    }
    return session;
  }

  async update(id: string, orgId: string, updateAcademicSessionDto: UpdateAcademicSessionDto, actorId: string) {
    const session = await this.findOne(id, orgId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (updateAcademicSessionDto.isCurrent) {
        await queryRunner.manager.update(
          AcademicSession,
          { organizationId: orgId, isCurrent: true },
          { isCurrent: false, updatedBy: actorId }
        );
      }

      // We'll warn about isActive=false manually or handle in apps layer, just updating for now.
      const updated = await queryRunner.manager.save(AcademicSession, {
        ...session,
        ...updateAcademicSessionDto,
        updatedBy: actorId,
      });

      await queryRunner.commitTransaction();
      return updated;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, orgId: string, actorId: string) {
    const session = await this.findOne(id, orgId);
    session.isActive = false;
    session.updatedBy = actorId;
    return this.academicSessionRepository.save(session);
  }
}
