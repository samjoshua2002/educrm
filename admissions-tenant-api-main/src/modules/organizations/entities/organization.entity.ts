import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum OrgStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ name: 'logo_url', length: 500, nullable: true })
  logoUrl: string;

  @Column({
    type: 'enum',
    enum: OrgStatus,
    default: OrgStatus.ACTIVE,
  })
  status: OrgStatus;

  @Column({ name: 'subscription_start', type: 'timestamp' })
  subscriptionStart: Date;

  @Column({ name: 'subscription_end', type: 'timestamp' })
  subscriptionEnd: Date;

  @Column({ name: 'created_by', nullable: true, type: 'uuid' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true, type: 'uuid' })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Branch, (branch) => branch.organization)
  branches: Branch[];

  @OneToMany(() => User, (user) => user.organization)
  users: User[];
}
