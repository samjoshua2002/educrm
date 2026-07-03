import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { Role } from '../../common/enums/roles.enum.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(
    dto: CreateUserDto,
    organizationId: string,
    actor: { id: string; role: Role },
  ): Promise<Omit<User, 'password'>> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }

    // Role Hierarchy Fix: org_admin cannot create superadmin
    if (actor.role !== Role.SUPERADMIN) {
      if (dto.role === Role.SUPERADMIN) {
        throw new ForbiddenException(
          'You are not authorized to create a superadmin',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      ...dto,
      password: hashedPassword,
      organizationId,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    const saved = await this.userRepo.save(user);

    // Remove password from response
    const { password: _, ...result } = saved;
    return result;
  }

  async createSuperadmin(
    name: string,
    email: string,
    rawPassword: string,
  ): Promise<Omit<User, 'password'>> {
    const existing = await this.userRepo.findOne({
      where: { role: Role.SUPERADMIN },
    });
    if (existing) {
      throw new ConflictException('Superadmin already exists');
    }

    const emailExists = await this.userRepo.findOne({ where: { email } });
    if (emailExists) {
      throw new ConflictException(`User with email "${email}" already exists`);
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = this.userRepo.create({
      name,
      email,
      password: hashedPassword,
      role: Role.SUPERADMIN,
      organizationId: undefined,
      branchId: undefined,
    });
    const saved = await this.userRepo.save(user);
    const { password: _, ...result } = saved;
    return result;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      select: [
        'id',
        'name',
        'email',
        'password',
        'role',
        'isActive',
        'organizationId',
        'branchId',
        'tokenVersion',
      ],
      relations: ['organization'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findAllByOrg(
    organizationId: string,
    paginationDto: PaginationDto,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const [data, total] = await this.userRepo.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateUserDto,
    actor: { id: string; role: Role },
  ): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id, organizationId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Security check for role changes
    if (dto.role && dto.role !== user.role) {
      // 1. User cannot change their own role
      if (actor.id === id) {
        throw new ForbiddenException('You cannot change your own role');
      }

      // 2. Only Superadmin or Org Admin can change to org_admin
      if (dto.role === Role.ORG_ADMIN && actor.role !== Role.SUPERADMIN && actor.role !== Role.ORG_ADMIN) {
        throw new ForbiddenException(
          'You are not authorized to assign the org_admin role',
        );
      }

      // 3. No one can change role to superadmin
      if (dto.role === Role.SUPERADMIN && actor.role !== Role.SUPERADMIN) {
        throw new ForbiddenException(
          'Unauthorized role assignment',
        );
      }

      // 4. Update role means tokenVersion MUST increment to invalidate old sessions
      user.tokenVersion += 1;
    }

    // Invalidate session on deactivation
    if (dto.isActive === false && user.isActive !== false) {
      user.tokenVersion += 1;
    }

    // Hash new password if provided
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    const { password: _, ...dtoWithoutPassword } = dto as any;
    Object.assign(user, dtoWithoutPassword);
    user.updatedBy = actor.id;
    return this.userRepo.save(user);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id, organizationId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    await this.userRepo.remove(user);
  }

  async deactivateStaffInBranch(branchId: string, organizationId: string, actorId: string): Promise<void> {
    const staff = await this.userRepo.find({
      where: { branchId, organizationId, isActive: true },
    });
    for (const user of staff) {
      user.isActive = false;
      user.tokenVersion += 1;
      user.updatedBy = actorId;
    }
    if (staff.length > 0) {
      await this.userRepo.save(staff);
    }
  }
}
