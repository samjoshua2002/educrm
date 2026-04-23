import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.js';
import { Branch } from '../../branches/entities/branch.entity.js';
import { Role } from '../../../common/enums/roles.enum.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.COUNSELOR,
  })
  role: Role;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  @Column({ name: 'token_version', default: 0 })
  tokenVersion: number;

  @Column({ name: 'created_by', nullable: true, type: 'uuid' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true, type: 'uuid' })
  updatedBy: string;

  @ManyToOne(() => Organization, (org) => org.users, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branch_id' })
  branch: Branch;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
